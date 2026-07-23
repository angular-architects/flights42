# The AG-UI Bridge: Progress Reporting and Shared State Across Workflow Steps and Sub-Agents

The Travel Planner's progress display does not just show _that_ the agent is
working, but _what_ it is working on: which workflow step is running and which
service calls it performs. The detail view behind the `More` button shows both —
the agent's workflow invocation including the extracted rough plan, and the
`searchFlights` / `findHotels` calls made _inside_ the steps.

This document describes how those signals travel from deep inside a nested
execution to the AG-UI wire — and why a dedicated bridge is needed for it. The
same bridge also holds the run's shared state and streams it back to the client;
that second role is covered under _Shared State_ below.

## The Problem: Nested Streams Lose Information

The execution is nested several levels deep: the client talks to the
`travelPlannerAgent`, which invokes the workflow as a tool, and the workflow's
steps in turn call services. Each of these layers produces its own event
stream, which Mastra forwards upwards through internal pipes.

Information gets lost along the way:

- When a workflow is invoked as an agent tool, its internals — step
  boundaries, and even more so calls made _inside_ the steps — have been
  observed not to arrive reliably in the outer stream.
- Calls that are not modeled as Mastra tools at all — such as the direct
  `searchFlights` service call inside a deterministic step — naturally never
  appear there in the first place.

## The Solution: A Per-Request Bridge That Bypasses the Streams

The bridge sidesteps the nested streams entirely. It is attached per request to
Mastra's `RequestContext`, which has one decisive property: it travels through
_all_ execution layers of the same HTTP request — from the agent through the
workflow tool into every single step and into sub-agents. Whatever runs there
can reach the bridge, no matter how deep the nesting. And because the context
is request-bound, concurrent users cannot interfere with each other.

The bridge itself is deliberately small, and it carries two kinds of signal. For
progress it has `emit` (step boundaries) and `emitToolCall` (service calls); for
shared state it has `getState` / `setState` (the run's working copy) and
`emitStateSnapshot` (pushing that copy to the client). Two functions attach the
bridge to the `RequestContext` (`attachBridge`) and retrieve it from there
(`getBridge`, also exported as `readBridge`):

```ts
// libs/ag-ui-server/step-bridge.ts
export const AG_UI_BRIDGE_KEY = 'agUiBridge';

export interface AgUiBridge {
  // Progress reporting
  emit(event: AgUiStepEvent): void;
  emitToolCall(event: AgUiToolCallEvent): void;

  // Shared state
  getState(): unknown;
  setState(state: unknown): void;
  emitStateSnapshot(state: unknown): void;
}

export function attachBridge(
  requestContext: RequestContext,
  bridge: AgUiBridge,
): void {
  /* ... */
}

export function getBridge(
  requestContext: RequestContext | undefined,
): AgUiBridge | undefined {
  /* ... */
}
```

## The Adapter Side: Translating Reports into AG-UI Events

The bridge is attached in the AG-UI adapter (`ExtendedMastraAgent`) — the
place that translates a Mastra agent into an AG-UI event stream. Before the
run starts, the adapter installs a bridge whose callbacks write AG-UI events
straight onto the wire:

```ts
// libs/ag-ui-server/extended-mastra-agent.ts
const emitBridgeToolCall = (event: AgUiToolCallEvent): void => {
  const toolCallId = event.toolCallId ?? randomUUID();

  observer.next({
    type: EventType.TOOL_CALL_START,
    parentMessageId: initialMessageId,
    toolCallId,
    toolCallName: event.toolName,
    ...(event.stepName ? { stepName: event.stepName } : {}),
  } as BaseEvent);

  // ... TOOL_CALL_ARGS, TOOL_CALL_END, and optionally TOOL_CALL_RESULT
};

const bridge: AgUiBridge = {
  emit: emitStep,
  emitToolCall: emitBridgeToolCall,
};
attachBridge(this.requestContext, bridge);
```

Step boundaries become `STEP_STARTED` / `STEP_FINISHED`; every reported
service call expands into the full `TOOL_CALL_START` / `ARGS` / `END` /
`RESULT` sequence — indistinguishable, from the client's point of view, from a
genuine tool call made by the model.

The `stepName` field rides along as extra information on the
`TOOL_CALL_START` event: AG-UI passes unknown fields through unchanged, so the
client can group tool calls under their parent workflow step. Timing-based
correlation would be unreliable at the latest once steps run in parallel.

## The Reporting Side: Emitting from Inside a Step

In the workflow code, two helpers encapsulate reading the bridge. A step such
as `findFlights` uses them like this:

```ts
// ai-server/src/mastra/workflows/package-tour-workflow.ts
execute: async ({ inputData, writer, requestContext }) => {
  const ctx: StepProgressContext = {
    writer,
    requestContext,
    stepName: 'findFlights',
  };
  await reportStepStatus(ctx, 'findFlights', 'started');

  const legs = await Promise.all(
    inputData.flights.map(async (leg) => {
      const candidates = await searchFlights(leg.from, leg.to, leg.date);
      reportToolCall(
        ctx,
        'searchFlights',
        { from: leg.from, to: leg.to, date: leg.date },
        candidates,
      );
      return { from: leg.from, to: leg.to, date: leg.date, candidates };
    }),
  );

  await reportStepStatus(ctx, 'findFlights', 'finished', {
    legCount: legs.length,
  });
  return { legs };
},
```

The helpers access the bridge — and, as a safety net, additionally report step
boundaries through Mastra's regular `writer`:

```ts
// ai-server/src/mastra/workflows/bridge.ts
export async function reportStepStatus(
  ctx: StepProgressContext,
  stepName: string,
  status: 'started' | 'finished',
  extras?: Record<string, unknown>,
): Promise<void> {
  const bridge = getBridge(ctx.requestContext);
  bridge?.emit({ stepName, kind: status, details: extras });

  await ctx.writer?.write({
    type: 'data-step-status',
    stepName,
    status,
    ...(extras ?? {}),
  });
}

export function reportToolCall(
  ctx: StepProgressContext,
  toolName: string,
  args: unknown,
  result: unknown,
): void {
  const bridge = getBridge(ctx.requestContext);
  bridge?.emitToolCall({ toolName, args, result, stepName: ctx.stepName });
}
```

## Shared State: The Run's Working Copy

Progress is not the only thing that flows through the bridge. The same
`RequestContext` attachment doubles as the run's shared-state store — this is how
the Travel Planner's plan tools read and mutate the travel plan without any
frontend round-trips. Three methods serve that role:

- `getState` / `setState` read and replace the run's working copy of the state,
- `emitStateSnapshot` streams that copy to the client as a `STATE_SNAPSHOT` event.

The adapter seeds the working copy at the start of a run with the `state` field
of the incoming `RunAgentInput` — whatever the client sent along. From there the
plan tools own it: each reads the current plan, mutates it, and commits the
result, so the next tool in the same run already sees the new state.

```ts
// ai-server/src/mastra/tools/plan/plan-store.ts
export function readPlan(
  requestContext: RequestContext | undefined,
): TravelPlan {
  const state = readBridge(requestContext)?.getState();
  return isTravelPlan(state) ? state : EMPTY_PLAN;
}

export function commitPlan(
  requestContext: RequestContext | undefined,
  plan: TravelPlan,
): TravelPlan {
  const ordered = {
    ...plan,
    hotels: orderHotelsByRoute(plan.hotels, plan.flights),
  };
  const bridge = readBridge(requestContext);
  bridge?.setState(ordered);
  bridge?.emitStateSnapshot(ordered); // fresh STATE_SNAPSHOT to the client
  return ordered;
}
```

Because every commit emits a snapshot, the client stays the source of truth: it
receives a full plan after each change and sends it back in as `state` on the
next run. The optional-access pattern (`bridge?.`) carries over from progress
reporting — without an adapter, `readPlan` simply falls back to `EMPTY_PLAN`.
Unlike progress reporting, though, shared state is not pure observation: it is
the data the tools operate on.

## Design Decisions

Two details deserve a second look.

**Optional access (`bridge?.`).** When the workflow runs without the AG-UI
adapter — in a unit test, for instance — there simply is no bridge, and the
reports fizzle out without consequence. Progress reporting is pure
observation and never influences the planning logic.

**Deliberate redundancy plus dedup.** One and the same step boundary can now
reach the adapter via up to three paths:

1. Mastra's own `workflow-step-*` chunks,
2. the custom `data-step-status` chunk written through the step's `writer`,
3. the bridge.

The adapter therefore dedupes per `stepName`, so exactly one `STEP_STARTED`
and one `STEP_FINISHED` per step arrive on the wire — regardless of which path
works in a given setup. This double-tracking is not a wart but insurance:
should future Mastra versions forward workflow internals reliably, the bridge
silently becomes redundant instead of broken.

## Arrival in the Client

On the client side, none of this feels special — and that is the point. A
small step tracker collects the step boundaries via the subscriber API of the
AG-UI SDK, accessible through the `agent` in CopilotKit's agent store:

```ts
// src/app/domains/shared/util-copilotkit/agent-step-tracker.ts
const subscription = store().agent.subscribe({
  onRunStartedEvent: clear,
  onStepStartedEvent: ({ event }) => {
    addStep(started, event.stepName);
  },
  onStepFinishedEvent: ({ event }) => {
    addStep(finished, event.stepName);
  },
});
```

This feeds the progress display. The reported service calls, in turn — thanks
to their expansion into regular `TOOL_CALL_*` sequences — sit in the store's
message history like any other call and appear in the detail view next to the
model's genuine tool calls. The client knows no difference between "the model
called a tool" and "a workflow step reported a service call": both are simply
tool calls in the stream.

## File Map

| Concern                                                       | File                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------- |
| Bridge definition (`AgUiBridge`, `attachBridge`, `getBridge`) | `libs/ag-ui-server/step-bridge.ts`                             |
| Adapter: attachment, event translation, dedup                 | `libs/ag-ui-server/extended-mastra-agent.ts`                   |
| Workflow-side report helpers                                  | `ai-server/src/mastra/workflows/bridge.ts`                     |
| Shared-state plan store (`readPlan`, `commitPlan`)            | `ai-server/src/mastra/tools/plan/plan-store.ts`                |
| Usage in the workflow steps                                   | `ai-server/src/mastra/workflows/package-tour-workflow.ts`      |
| Client-side step tracker                                      | `src/app/domains/shared/util-copilotkit/agent-step-tracker.ts` |
