# Stock adapter migration (de-customization plan)

Status: planned, not started. Written 2026-09-05 from a source-level analysis
of the `@ag-ui/mastra@1.1.2` tarball and the current `libs/ag-ui-server`.
Precondition: the [CopilotKit 0.5.x upgrade](copilotkit-0.5.0.md) is executed
first as a **separate migration** — it aligns `@ag-ui/{core,client}` to
`0.0.59`, which removes the runtime blocker for `@ag-ui/mastra`
(`tokenUsageFromAiSdkUsage` needs core >= 0.0.58).
Related docs: [bridge.md](bridge.md) (why the custom adapter exists today),
[copilotkit-0.4.0.md](copilotkit-0.4.0.md).

## Goal

Replace the custom `ExtendedMastraAgent` + bridge
(`libs/ag-ui-server`) with the stock `MastraAgent` from `@ag-ui/mastra`, by
**redesigning the demos onto the feature set stock supports natively** —
not by wrapping or subclassing stock. Subclassing was evaluated and
rejected: every extension point (`createChunkProcessor`,
`makeStreamCallbacks`, `streamMastraAgent`) is `private` in the typings, and
the tripwire / workflow-step cases live below the event level, so a hybrid
would be a fragile wrapper around minified internals.

The workshop's teaching focus shifts accordingly: from "how AG-UI works on
the wire / how to build an adapter / how to bridge Mastra's stream boundary"
to "the idiomatic CopilotKit + Mastra happy path". The current branch remains
as the wire-level counterpart; the comparison itself is teaching material.

## Decisions per area

### 1. Shared state → working memory (stock model)

- Agents that carry plan state get a Memory instance (libsql is already in
  the repo) with `workingMemory` enabled.
- Stock syncs `input.state` into working memory at run start, derives
  `STATE_SNAPSHOT` / `STATE_DELTA` live from streamed `updateWorkingMemory`
  tool-call args (hidden from the wire automatically), and emits a final
  snapshot at run end.
- The typed plan-mutation tools (`INTERNAL_PLAN_TOOL_NAMES`) are **removed**;
  the LLM mutates state via `updateWorkingMemory`. This also removes the need
  for `hiddenToolNames` entirely.
- Accepted costs: the LLM rewrites the state blob (no per-mutation Zod
  validation), state becomes server-persisted per thread/resource (client is
  no longer sole source of truth; drop the `state:` callback in
  `AppHttpAgent`), and state commits from inside workflow steps surface only
  at run end (same stream boundary as today).

### 2. Interrupts → stock

- Mastra suspend/resume stays; only the AG-UI mapping changes to stock's:
  `reason: 'mastra:tool_suspend'`, interrupt id `runId::toolCallId`, payload
  under `metadata.mastra`, plus a `CUSTOM on_interrupt` event.
- Client changes: `SERVER_INTERRUPT_REASONS` in
  `src/app/domains/shared/util-copilotkit/app-http-agent.ts`, and every
  `injectInterrupt` consumer that reads `metadata.toolName` /
  `suspendPayload` (new path: `metadata.mastra.*`).

### 3. Workflow-step progress → background tasks (activity events)

Chosen approach: run the booking workflow as a Mastra **background task**
instead of workflow-as-tool. Stock maps `background-task-*` chunks to
`ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA` with activity type
`mastra-background-task` (status, args, outputs, progress, suspend,
completion).

- Client: a custom Angular `ActivityRenderer` registered via
  `RenderActivityMessageConfig` — the same official extension point the A2UI
  renderer (`a2ui-activity-renderer.ts`) uses today. This **replaces** the
  current step tracker; it is a swap of custom UI, not added custom surface.
  CopilotKit ships no built-in renderer for this activity type.
- The bridge, `STEP_STARTED/FINISHED` emission, and the step dedup logic are
  deleted with `libs/ag-ui-server`.
- Alternatives kept on record, not chosen: (a) hand each step to the LLM as
  an individual tool (native `TOOL_CALL_*` visibility, but LLM orchestration
  instead of a deterministic workflow); (b) restructure as sub-agents —
  `agent-execution-*` chunks do cross the stream boundary and AG-UI 0.0.59
  defines `SUBAGENT_*` events, but stock 1.1.2 still drops those chunks.

### 4. MCP Apps → stock middleware, with agent-local registration

The 2026-07-29 veto (tool execution stays on agent level) is **conditionally
lifted**: execution may move to `MCPAppsMiddleware`, provided the
agent-to-tools assignment stays declarative and agent-local.

- A registry `Record<agentId, MCPClientConfig[]>` maintained next to the
  agent definitions (same pattern as today's `HIDDEN_TOOLS` map in
  `ag-ui-route.ts`). Key by `agentId` string, not agent instance.
- The route builds (and caches) one `MCPAppsMiddleware` instance per agent
  from that registry and selects it per request — including the `agentMode`
  → agentId mapping. This is why the middleware lives in **our route**, not
  in the CopilotKit runtime (whose middleware config is runtime-global).
- The native `MCPClient.listTools()` registration in `ticketing-agent.ts`
  and the `_meta.ui` sniffing / `serverHash` emission in the adapter are
  removed; the middleware handles snapshotting and the iframe proxy
  (`__proxiedMCPRequest` handling collapses into the normal path).
- Documented consequence of the semantics change: the MCP tools run as AG-UI
  client tools through the middleware, so they are absent in the `mastra dev`
  playground and any non-AG-UI channel, invisible to Mastra processors,
  memory and tracing, and unavailable to sub-agents. Acceptable because the
  hotels widgets are chat-only.

### 5. A2UI → stock a2ui path

Move the `showTable`-style surface demo from the shape-based
surface-from-tool-result detection to stock's a2ui support (`a2ui`
constructor option, auto-injection, `data-a2ui-render` chunks). The client
already uses the matching `@copilotkit` a2ui renderer.

### 6. Tripwire and reasoning-delta — the open items

Stock has no `tripwire` case (the chunk hits the default warn-and-drop and
the run ends as an empty success) and routes `reasoning-delta` to
`REASONING_*` events (providers that stream the visible answer as reasoning
lose the text).

- Preferred fix for both: **upstream PRs** against `@ag-ui/mastra` (a
  tripwire case emitting a configurable message; a reasoning-as-text opt-in
  or provider workaround). This is the consistent move for a plan whose goal
  is "not custom".
- Fallback for the guardrail demo until merged: have the processor raise an
  error instead of a tripwire (`RUN_ERROR` UX), or accept the regression and
  demo guardrails elsewhere.
- Reasoning fallback: pick a demo model that does not stream visible text as
  reasoning.

### 7. What stays as is

- **Own Hono route** (parse + `streamSSE`, the `concatMap` write-ordering
  fix, per-request `RequestContext`, `agentMode` switch, per-agent
  middleware selection). The CopilotKit server runtime (option "d") stays
  rejected: it would not remove the adapter dependency, cannot see Mastra's
  server middleware `RequestContext`, cannot scope its MCP middleware per
  agent, and costs ~45 dependencies (graphql-yoga, second hono, all
  `@ai-sdk/*` providers, license verifier).
- `useServerMemory` message dedup: switch from the client-side sent-filter to
  stock's server-side `selectNewMessages` (requires Memory on the agents —
  aligned with area 1). The per-thread tool-name cache (`memory-store.ts`)
  becomes obsolete because stock resolves tool names against the full
  `input.messages`.

### 8. Client: retire `AppHttpAgent` in favor of client middlewares

`@ag-ui/client` ships a public middleware API (`agent.use(...)`,
`Middleware` / `MiddlewareFunction` rewriting `RunAgentInput` before send) —
already present in 0.0.57. After areas 1 and 2, `AppHttpAgent` reduces to a
plain `HttpAgent` plus `use()`:

- `useServerMemory` sent-filter: becomes a stateful **SentFilterMiddleware**
  (the client must not resend known history — requirement, not a nice-to-
  have). It filters already-sent messages out of `input.messages`, marks
  messages as sent only when it observes `RUN_FINISHED` in the event stream
  (same semantics as today's `onRunFinalized` subscriber), skips
  `__proxiedMCPRequest` runs, and exposes the `clearSentHistory()` reset.
  One rule must mirror stock's server-side `selectNewMessages`: when an
  unsent **tool** message is included, its parent assistant message (the one
  carrying the matching tool call) must be re-included even if already sent
  — stock resolves tool names by looking them up in the full
  `input.messages`, and without the parent the converted tool result gets
  `toolName: 'unknown'` (this lookup is what the server-side
  `memory-store.ts` cache solved in the custom adapter). Server-side
  `selectNewMessages` stays active as an idempotent safety net for the
  re-included parents.
- `forwardedProps()` injection (`agentMode`): a small `FunctionMiddleware`
  merging dynamic props into `input.forwardedProps`, attached in
  `init-agent-store.ts`.
- `state()` callback: gone with area 1 (working memory).
- Interrupt tool-result echo suppression: the one open point. A middleware
  can strip the echo from `input.messages` (tool messages whose `toolCallId`
  matches a pending interrupt) — wire-equivalent to the `addMessage`
  override, but the echo stays in local agent state. Possibly obsolete
  after 0.5.x (HITL `onResult` fix, PR #6586); verify in phases A/B before
  porting it.

## Accepted dependency costs

- `@ag-ui/mastra` peers on `@copilotkit/runtime ^1.60.1` — the runtime gets
  installed as a peer even though we do not serve through it.
- A nested zod `^3.25.76` next to the root zod 4 (same situation as the SDK,
  see the A2UI catalog-base workaround).
- `@ag-ui/a2ui-toolkit` comes along as a direct dependency of the adapter.

## Phases

### Phase A — adopt stock adapter for the simplest agent

1. Install `@ag-ui/mastra` (post-0.5.x; expect the runtime peer, check
   `package-lock.json` for duplicate `@ag-ui/*` installs).
2. Swap one agent without state/steps/MCP (candidate: the plain booking
   chat) to `MastraAgent.getLocalAgent` in the route; keep
   `ExtendedMastraAgent` for the rest.
3. Client: adjust interrupt constants (area 2); smoke-test approve/reject.

### Phase B — state and message dedup

1. Memory + working memory for the travel-refinement agent; delete the plan
   tools and `hiddenToolNames`; adapt the system prompt to
   `updateWorkingMemory`.
2. Retire `AppHttpAgent` per area 8: plain `HttpAgent` + `use()`
   middlewares (SentFilterMiddleware with the parent-reinclusion rule,
   forwardedProps merge); test whether the interrupt echo suppression is
   still needed.
3. Re-verify the live-refinement demo ("Remove all hotels") and document the
   changed update granularity.

### Phase C — background-task progress

1. Booking workflow as background task; verify `background-task-*` chunks in
   the SSE body.
2. Custom `ActivityRenderer` for `mastra-background-task`; remove the step
   tracker and `STEP_*` handling client-side.

### Phase D — MCP Apps and A2UI

1. Agent-local MCP registry + per-agent middleware in the route; remove
   native MCP tool registration and adapter sniffing.
2. Move the surface demo to stock a2ui.
3. Re-run the hotels widget flow (iframe proxy, serverHash caching).

### Phase E — upstream and teardown

1. File the tripwire and reasoning-delta issues/PRs upstream; wire the
   fallback chosen in area 6 until merged.
2. Delete `libs/ag-ui-server` (adapter, bridge, convert-messages, store);
   update [bridge.md](bridge.md) to historical/comparison material.
3. Linter with `--fix`; record results here. No commit — working tree stays
   open for review.

## Risks

- Stock's chunk processor is the compatibility surface now: each
  `@ag-ui/mastra` release must be re-smoked against the demos (no more
  control over the mapping).
- Working-memory state depends on the LLM faithfully rewriting the blob —
  the refinement demo may need prompt iteration.
- Background-task semantics (untilIdle, suspension) differ from
  workflow-as-tool; interrupt flow inside a background task needs an
  explicit test.
- The upstream PRs (area 6) may stall; the tripwire fallback changes demo
  UX.
