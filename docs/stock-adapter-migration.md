# Stock adapter migration (de-customization plan)

Status: all phases executed 2026-09-06 on `copilotkit-v0.5.0` (working tree,
not committed; see the execution log and verification results at the end).
Written 2026-09-05 from a source-level analysis of the `@ag-ui/mastra@1.1.2`
tarball and the then-current `libs/ag-ui-server`.
Precondition: the [CopilotKit 0.5.x upgrade](copilotkit-0.5.0.md) is executed
first as a **separate migration** — it aligns `@ag-ui/{core,client}` to
`0.0.59`, which removes the runtime blocker for `@ag-ui/mastra`
(`tokenUsageFromAiSdkUsage` needs core >= 0.0.58).
Related docs: `bridge.md` (deleted 2026-09-07; `git show 23bb6183:docs/bridge.md`) (why the custom adapter existed),
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

### 5. A2UI → stock render subagent first, own render tool as fallback

**Decision 2026-09-06: implement variant A (stock subagent) first.** The
user reviews the result; if the subagent does not convince, revert to
variant B (own render tool + `A2UIMiddleware`, documented below) on
request. Both variants share the transport (`A2UIMiddleware` in our route
emitting `a2ui-surface`) and the client renderer; they differ only in how
the surface is generated on the server.

#### Variant A — stock render subagent (primary)

The adapter's only A2UI path: the auto-injected `generate_a2ui` render
subagent (`a2ui` constructor option / `forwardedProps.injectA2UITool`). The
catalog schema goes into the subagent's prompt (`## Available Components`),
the main agent only sees `generate_a2ui(intent, target_surface_id,
changes)`, and the subagent runs `render_a2ui` with `toolChoice: required`,
`maxSteps: 1`, plus the toolkit's validate→retry loop.

- **Server:** `MastraAgent` gets `a2ui: { injectA2UITool: true, model,
defaultCatalogId }`. `renderA2uiTool`, `addCustomCatalogInstructions`,
  `catalog-to-prompt.ts`, `schema-example.ts` and the whole A2UI rule block
  in `ticketing-agent.prompt.ts` are **deleted**; the prompt only keeps the
  intent ("show the search form / the booked flights as a surface") and the
  `a2ui_form_response` handling.
- **Client catalog forwarding switches to the stock contract:**
  `catalog-context.ts` emits the context entry with
  `A2UI_SCHEMA_CONTEXT_DESCRIPTION` (from `@copilotkit/a2ui-renderer`, a
  pure export) and the v0.9 inline-catalog value `{ catalogId, components:
{ <name>: <JSON Schema> } }` built from the existing `zodToJsonSchema`
  output. The `catalogIdOnly` mode goes (the subagent needs the schema).
  `config.a2ui.catalog` stays unset so CopilotKit's built-in Lit renderers
  do not register.
- **Renderer:** `A2uiActivityRenderer` stays (Angular custom catalog) and
  additionally handles the lifecycle content the middleware stamps on the
  same activity (`status: building | retrying | failed`, read via
  `readA2UILifecycleContent`; `CopilotA2UIRecovery` from
  `@copilotkit/angular` is reusable for the pre-paint UI).
- **Known risk, to verify in the review:** the subagent receives the
  conversation as user/assistant text only — tool results are filtered
  out. Data for a surface (the booked-flights list) reaches it only through
  the `changes` argument or the assistant text, i.e. an extra lossy LLM hop
  and a second model call per surface. The search form is unaffected.
- Security note for the workshop: the isolation is real (the surface step
  cannot call booking tools) but the same untrusted data already sits in the
  main agent's context; the tangible gain is the main prompt losing ~300
  lines of A2UI rules that dilute its guardrails.

#### Variant B — own render tool on the main agent (fallback)

Beyond the subagent, the adapter has no catalog mechanism: it merely stores
`input.context` under `requestContext['ag-ui'].context`, exactly like the
custom adapter does, and it never emits an A2UI activity (its only activity
types are `mastra-background-task` and `mastra-observational-memory`).

The `a2ui-surface` `ACTIVITY_SNAPSHOT` that CopilotKit's client expects is
produced by a different stock package: `@ag-ui/a2ui-middleware`
(`A2UIMiddleware`, a plain `@ag-ui/client` `Middleware`). It watches
`TOOL_CALL_START` for the names in `a2uiToolNames` (default `render_a2ui`),
progressively builds the surface from the streamed args (`surfaceId`, flat
`components`, `data`), emits `a2ui-surface` snapshots with `replace: true`
on the stable message id `a2ui-surface-<toolCallId>` (including the
`status: 'building'` pre-paint), and can optionally inject the schema
context entry and a client-side `render_a2ui` tool. In the CopilotKit
runtime it runs server-side; being an AG-UI middleware it can equally be
attached with `agent.use()` on our side. This is the mechanism that replaces
the adapter's `getA2uiSurface` tool-result sniffing.

- **Middleware placement: our Hono route, server-side, per agent** — the
  same pattern as `MCPAppsMiddleware` in area 4. Config: `injectA2UITool:
false` (we keep our own server tool with validation), `a2uiToolNames:
['render_a2ui']`, `defaultCatalogId` = the catalog id forwarded by the
  client. The client keeps receiving `a2ui-surface` activities exactly as
  today; no client middleware needed for A2UI.
- **Render tool stays ours, renamed and reshaped.** `renderA2uiTool` becomes
  `render_a2ui` with the flat input (`surfaceId`, `components` with root id
  `root`, optional `data`) so the middleware can stream it; the
  `{ messages: A2uiMessage[] }` contract in the tool description and
  `ticketing-agent.prompt.ts` is rewritten. The `execute` validation
  (child/children shape, referential integrity) stays; the tool moves into
  `ai-server`.
- **Catalog forwarding stays ours, unchanged.** Client context entry
  (`catalog-context.ts`) → `RequestContext` → `addCustomCatalogInstructions`
  is agent-level code and works against stock as is. The files
  (`add-custom-catalog-instructions.ts`, `catalog-to-prompt.ts`,
  `schema-example.ts`, `log-prompt.ts`) move from `libs/ag-ui-server` into
  `ai-server` before the lib is deleted. Optional later step: switch the
  entry to the middleware's `schema` option (stock description string,
  v0.9 inline-catalog format) and teach the prompt builder that format.
- **Client keeps our Angular renderer.** CopilotKit Angular 0.5 ships
  `CopilotA2UIActivityRenderer` (for `a2ui-surface`) and
  `CopilotA2UIToolRenderer` (for `render_a2ui` calls), but both wrap the Lit
  `<a2ui-surface>` web component with a web-core catalog — our custom
  catalog consists of Angular components, so `A2uiActivityRenderer` stays.
  The built-ins only register when `core.a2uiEnabled` (runtime info) or
  `config.a2ui.catalog` is set; neither applies here, so no conflict. One
  change: the middleware puts the operations under `a2ui_operations`
  (`A2UI_OPERATIONS_KEY` from `@ag-ui/a2ui-toolkit`), whereas our renderer
  and the dashboard route use `operations` — the renderer reads both, or the
  dashboard route switches to the stock key.
- Dependency: `@ag-ui/a2ui-middleware` (peer `@ag-ui/client`, brings
  `clarinet` + `@ag-ui/a2ui-toolkit@0.0.4`).

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
- `@ag-ui/a2ui-toolkit` comes along as a direct dependency of the adapter
  and of `@ag-ui/a2ui-middleware`.

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
2. A2UI per area 5, variant A: install `@ag-ui/a2ui-middleware` and
   attach it per agent in the route; enable `a2ui.injectA2UITool` on the
   `MastraAgent`; switch `catalog-context.ts` to the stock schema entry;
   delete the render tool, the catalog-prompt files and the A2UI prompt
   block; make the activity renderer read `a2ui_operations` and the
   lifecycle content. Re-run the search-form and booked-flights surfaces
   and the dashboard; the booked-flights data handoff via `changes` is the
   review criterion. Variant B (own `render_a2ui` tool with
   `injectA2UITool: false`, catalog-prompt files moved to `ai-server`) is
   applied only if the review rejects A.
3. Re-run the hotels widget flow (iframe proxy, serverHash caching).

### Phase E — upstream and teardown

1. File the tripwire and reasoning-delta issues/PRs upstream; wire the
   fallback chosen in area 6 until merged.
2. Delete `libs/ag-ui-server` (adapter, bridge, convert-messages, store;
   the catalog-prompt files and the render tool were deleted in phase D
   under variant A, or moved to `ai-server` under variant B);
   update `bridge.md` to historical/comparison material.
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

## Execution log (2026-09-06)

All phases executed on branch `copilotkit-v0.5.0`, working tree only (no
commit). Deviations from the plan, in phase order:

- **Phase A — `@copilotkit/runtime` peer.** `npm install @ag-ui/mastra` fails
  with ERESOLVE: the runtime's optional LangChain peers (`@langchain/community`
  → `@browserbasehq/stagehand`) demand zod 3 against the root zod 4, and an
  `openai@^6` override does not clear the chain. Instead of installing the
  runtime (or `legacy-peer-deps`), the peer is aliased to an empty local
  package: `overrides["@copilotkit/runtime"] = "file:./libs/copilotkit-runtime-stub"`.
  `@ag-ui/mastra`'s main entry never imports the runtime (only the unused
  `@ag-ui/mastra/copilotkit` entry does), so nothing is lost and the ~45
  runtime dependencies stay out of the tree. `npm ls` shows one `@ag-ui/core`
  and `@ag-ui/client` (0.0.59); the adapter nests its own zod 3 and
  `@ai-sdk/ui-utils`.
- **Phase A — route.** `ag-ui-route.ts` builds a `MastraAgent` per request
  (`resourceId = threadId`, `requestContext` from Hono) and selects a cached
  middleware chain per agent id from `AGENT_UI_CONFIG` (MCP servers, A2UI,
  `untilIdle`). `streamAgentEvents` now takes `middlewares[]` and composes
  them the way `@ag-ui/client`'s `runAgent` does (`composeMiddlewares`).
  Abort propagation (`setAbortSignal`) has no stock equivalent; a closed SSE
  no longer aborts the Mastra run.
- **Phase A — interrupts.** Stock emits `reason: 'mastra:tool_suspend'`,
  `id: '<runId>::<toolCallId>'`, payload under `metadata.mastra`; only
  `chat-messages.ts` needed the new path. The interrupt tool-result echo
  suppression is obsolete: CopilotKit 0.5.1 adds the echo only for
  `reason === 'tool_call'`, so no tool message is added for Mastra suspends
  (verified: the resume request carries no messages).
- **Phase A — `developer` messages.** Stock's `convertAGUIMessagesToMastra`
  drops the `developer` role (the A2UI form response and the refinement
  preamble arrived as an empty run). A one-line client middleware
  (`developerMessagesAsUser`) sends them as `user`; local role stays
  `developer` so the chat keeps hiding them. Upstream draft #3.
- **Phase B — working memory.** `travelRefinementAgent` uses
  `workingMemory: { enabled, schema: travelPlanSchema, scope: 'resource' }`.
  `scope: 'thread'` fails on the first run (`Thread <id> not found`: stock
  syncs `input.state` before the thread exists; upstream draft #7); resource
  scope is equivalent here because `resourceId === threadId`. The plan tools,
  `plan-store.ts`, `INTERNAL_PLAN_TOOL_NAMES` and `hiddenToolNames` are gone;
  `tools/plan/` keeps only the schemas. Client: `TravelRefinementChatService`
  pushes `planStore.plan()` into `agent.setState()` (stock syncs `input.state`
  into working memory at run start) and applies incoming state only when it
  is a complete plan — the live `STATE_DELTA`s are derived from the streamed
  `updateWorkingMemory` args and carry partial strings (`"2026-09-16T"`),
  which otherwise reach the `DatePipe`.
- **Phase B — `AppHttpAgent` retired.** `agent-middlewares.ts`:
  `SentFilterMiddleware` (sent-filter with the parent-reinclusion rule, marks
  on request and on `RUN_FINISHED` via `runNextWithState`, skips
  `__proxiedMCPRequest`, `clearSentHistory(agent)` registry),
  `forwardedPropsMiddleware`, `developerMessagesAsUser`. `initAgentStore`
  wires them on a plain `HttpAgent`; the `state` and `catalogIdOnly` options
  are gone.
- **Phase C — background task.** `travelPlannerAgent` gets
  `backgroundTasks.tools.packageTourWorkflow` and — required for `untilIdle`,
  which otherwise falls through to a plain stream that ends after
  `background-task-started` — a `Memory`. Mastra: `backgroundTasks: { enabled:
true }`. Contrary to the 1.1.2 caveat, on core 1.63 the full lifecycle
  arrives (`running`, eleven `output` deltas, `completed`) and the agent is
  re-invoked in the same SSE stream to render the widgets. The
  `background-task-output` deltas carry the workflow's own `workflow-step-*`
  chunks and the `data-service-call` chunks the steps write via
  `writer.custom(...)` (replacing the bridge's `reportToolCall`). Client:
  `activity/background-task.ts` derives steps and service calls from the
  activity content, `TravelWorkflowProgress` reads the latest
  `mastra-background-task` activity from the messages, and
  `BackgroundTaskActivityRenderer` is registered app-wide. Prompt: the agent
  must end its turn after the acknowledgement and render when re-invoked.
- **Phase D — MCP.** Registry `AGENT_UI_CONFIG[agentId].mcpServers` in the
  route, one `MCPAppsMiddleware` per agent; proxied requests use the
  middleware of the URL's agent id (independent of `agentMode`). The native
  `MCPClient` registration and the `_meta.ui` sniffing are gone; the tool is
  now called `findHotels` (the prompt's MCP section is rewritten for the
  client-tool semantics: the widget ends the turn, no trailing
  `messageWidget`).
- **Phase D — A2UI variant A.** `A2UIMiddleware({ injectA2UITool: false })`
  per agent in the route, `a2ui: { injectA2UITool: true, model }` on the
  ticketing `MastraAgent` (`model` must be passed; `agent.model` is not a
  public property). `catalog-context.ts` emits the stock schema entry
  (`A2UI_SCHEMA_CONTEXT_DESCRIPTION`, inline v0.9 catalog built from
  `BASIC_COMPONENTS` + the custom components, ~53 kB per request). The
  client-side event contract (`checkIn`, `submitAnswer`) is forwarded as a
  plain context entry (`a2ui-event-contract.ts`) — stock renders regular
  context entries into the subagent prompt. The renderer reads
  `a2ui_operations` and `operations`, applies progressive snapshots to an
  existing surface, and shows `CopilotA2UIRecovery` while
  `status: building | retrying | failed`. Dashboard route and compiler use the
  stock `A2UI_OPERATIONS_KEY` and a local `readCatalogId`.
- **Phase E.** `libs/ag-ui-server` deleted, `ai-server/tsconfig.json` paths
  removed, `ai-demo/server/chat-route.ts` on `MastraAgent.getLocalAgent`,
  `bridge.md` marked historical (deleted 2026-09-07 with the hybrid; the
  bridge code is at `git show 23bb6183:libs/ag-ui-server/`). Upstream issues are drafted in
  [upstream/ag-ui-mastra-issues.md](upstream/ag-ui-mastra-issues.md) and
  **not filed** (external action, left for the review). Guardrail processors
  are not attached to any agent on this branch, so the tripwire gap has no
  live effect; no reasoning-as-text regression was observed with
  `openai/gpt-5.6-luna` (answers arrive as tool calls / `text-delta`,
  reasoning as `REASONING_*`).

## Addendum (2026-09-07) — granular plan tools on working memory

The Phase B decision (LLM rewrites the state blob via `updateWorkingMemory`)
was revised after review: whole-array replacement (`deepMergeWorkingMemory`
replaces arrays, no per-item patching) moves the plan's correctness onto the
LLM copying items verbatim, which is exactly the error source the granular
tools existed for. Working memory is kept as the **state transport** (stock
sync of `input.state` at run start, `STATE_SNAPSHOT` at run end); the
**mutation API** is the seven typed tools again.

- `tools/plan/plan-memory.ts`: one shared `Memory` with
  `workingMemory: { enabled, schema, scope: 'resource', agentManaged: false }`.
  `agentManaged: false` drops the generic `updateWorkingMemory` tool
  (`@mastra/memory` `listTools`) and switches the injected system
  instruction to the read-only variant, so the model still sees the plan as
  context but is no longer told to rewrite it. `readOnly: true` is **not**
  set — it is a top-level `MemoryConfig` flag that stops saving messages.
- `tools/plan/plan-store.ts`: `readPlan`/`commitPlan` against
  `travelPlanMemory.getWorkingMemory` / `updateWorkingMemory`
  (`threadId`/`resourceId` from the tool context's `agent`; the update is
  mutex-serialised per scope in `@mastra/memory`). `orderHotelsByRoute` is
  back in code.
- The seven tools (`getTravelPlan`, `setTravelPlan`, `add/remove/replace…`)
  are restored on the new store; the refinement prompt is back to the tool
  version, plus: the working-memory block is a start-of-turn snapshot, so
  the model verifies via `getTravelPlan` after a change.
- Cost: no live `STATE_DELTA`s during the run — stock derives them only from
  the built-in tool's streamed args. The client ignored those anyway
  (partial strings, `isCompletePlan`), so the panel still updates from the
  run-end snapshot. Nothing changed on the client.
- Not re-smoked live; `tsc --build ai-server/tsconfig.json` and ESLint are
  clean.

## Addendum (2026-09-07) — hybrid: stock plus three contained workarounds

Decision after review: keep the stock adapter and close the two remaining
regressions with code on public APIs only, one piece per upstream draft.
Each piece is removable once its upstream fix lands.

- **Approval flow, draft #4 — resume proxy in the route.** For a
  `RunAgentInput` whose `resume[]` carries a `resolved` entry, the route
  hands stock a `Proxy` of the Mastra agent whose `stream()` calls
  `agent.resumeStream(payload, { …opts, runId, toolCallId })` (ids parsed
  from the interrupt id `<runId>::<toolCallId>`); every other member is
  bound to the real agent (private fields). `resume` is stripped from the
  input, so stock takes its normal path and passes `clientTools`,
  `toolsets`, `untilIdle` — the resumed run can call `messageWidget` again.
  A `cancelled` entry stays on stock's own path (no Mastra call). This is
  the same `resumeStream(…, { clientTools })` call the old bridge made.
- **Action cards, draft #5 — `ResumedToolCallMiddleware` (client).**
  Records `RUN_FINISHED.outcome.interrupts` (`toolCallId`, and `toolName` /
  `args` from `metadata.mastra`) per interrupt id; on a run that resumes
  one of them, it emits the `TOOL_CALL_START/ARGS/END` triple (fresh
  `parentMessageId`) right before the resumed call's `TOOL_CALL_RESULT`, so
  `registerRenderToolCall` renderers see the call. Attached after the
  sent-filter so the synthesized messages are marked sent and never re-sent
  (Mastra memory holds the canonical copies). Mastra-specific by design:
  `toolName`/`args` exist nowhere else on the wire.
- **A2UI table, draft #8 — variant B.** `renderA2uiTool` (v0.9 message
  contract, validation as before) returns `{ surfaceId, a2ui_operations }`;
  `A2UIMiddleware({ injectA2UITool: false })` in the route paints the
  surface from the `TOOL_CALL_RESULT` envelope. The `a2ui` option on
  `MastraAgent` (stock `generate_a2ui` subagent) is gone. The catalog
  prompt section is rebuilt from the stock context entry
  (`A2UI_SCHEMA_CONTEXT_DESCRIPTION`): custom components are the entries
  whose inline schema carries a `description`; basic components are
  skipped. `ticketing-agent.prompt.ts` is back to the `catalogId`-function
  form from before the migration — the migrated prompt had lost its Output
  and Data Rules sections (truncated mid-sentence), which this restores;
  the MCP hotels wording from the migration is kept.

Files: `ai-server/src/mastra/a2ui/` (`render-a2ui.tool.ts`,
`catalog-context.ts`, `add-custom-catalog-instructions.ts`,
`schema-example.ts`), `routes/ag-ui-route.ts`,
`agents/ticketing-agent{,.prompt}.ts`; client
`util-copilotkit/agent-middlewares.ts` (+ spec), `init-agent-store.ts`.

Same day: the per-agent table `AGENT_UI_CONFIG` left the route. Each agent
file now writes its own entry into `agUiRouteConfig` (mutable registry in
`routes/ag-ui-route-config.ts`, filled at import time): `mcpServers`,
`a2ui`, `untilIdle` — properties only, no middleware objects; the route
still turns them into `MCPAppsMiddleware` / `A2UIMiddleware` (cached per
agent). The
`USE_MCP` switch is thereby confined to `ticketing-agent.ts`.

Also removed: the app-wide `backgroundTaskActivityRendererConfig`
registration and `background-task-activity-renderer.ts`. Activity messages
are only rendered by the assistant chat and the dashboard, and no agent
shown there starts a background task; the travel planner reads the
`mastra-background-task` activity straight from its messages
(`selectBackgroundTask`), so the renderer never rendered.

`libs/feature-flags` moved to a root-level `feature-flags/` folder, imported
as `@flights42/feature-flags` (tsconfig `paths` in the root tsconfig for
Angular and, explicitly, in `ai-server/tsconfig.json` for `mastra`'s
bundler). A bare root file was rejected by Sheriff (`root` tag has no
clearance for domain modules); the folder is tagged `lib:feature-flags` in
`sheriff.config.ts`. `libs/` now holds only the runtime stub.
Not re-smoked live; `tsc --build ai-server/tsconfig.json`, ESLint, `ng
lint`, `ng build` and `ng test` results are in the summary of the session.

## Verification results (2026-09-06)

Builds: `tsc --build ai-server/tsconfig.json` clean, `ng build` clean (known
CommonJS warnings), `ng lint --fix` clean, `npm run test:aimock` 3/3, `ng test` 25/25 (the
`copilot-activity` spec now asserts that later snapshots for the same surface
are applied in place, matching the stock middleware's progressive
`replace: true` snapshots). Live runs against `mastra dev` + `ng serve`
(Playwright scripts in `tmp/stock-*.mjs`, gitignored):

| Scenario                                     | Result                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Booked flights (widgets)                     | OK. Sent-filter + parent reinclusion on the wire: `assistant, tool×5, user` on the second turn.                                                                                                                                                                                                                                                                                                          |
| Book / cancel with approval                  | Interrupt → `outcome.interrupts[{ reason: 'mastra:tool_suspend' }]`, resume with `{ selection }` → tool executes (`Booked flight 358 …`). **Regression:** the resumed run ends with the bare `TOOL_CALL_RESULT` — no action card (stock never emits `TOOL_CALL_*` for a suspended tool) and no `messageWidget` (stock resumes without `clientTools`, drafts #4/#5). The next user turn sees the booking. |
| A2UI search form + submit                    | OK. Subagent renders the form from the conversation, `submitAnswer` → `a2ui_form_response` → `findFlights` navigates to the search page.                                                                                                                                                                                                                                                                 |
| A2UI booked-flights table (review criterion) | **Fails the criterion:** the surface renders headers and "No booked flights". The subagent only sees user/assistant text; `changes` is ignored on create and the assistant message carrying the `generate_a2ui` call is stripped, so neither a render brief nor the tool result reaches it (draft #8). Variant B (own `render_a2ui` tool) remains the documented fallback.                               |
| Travel planner (background task)             | OK. Step tracker updates live from the activity (`✓ Flights ✓ Hotels, Travel Plan active`), service calls listed under "More", widgets rendered after the automatic continuation.                                                                                                                                                                                                                        |
| Refinement "Remove all hotels"               | OK. `STATE_SNAPSHOT` at start, streamed `STATE_DELTA`s, final snapshot; plan panel updates. Granularity: one `updateWorkingMemory` call per change, deltas are partial while streaming (see Phase B).                                                                                                                                                                                                    |
| Dashboard                                    | OK. Cached and fresh runs emit `a2ui_operations`; two surfaces rendered.                                                                                                                                                                                                                                                                                                                                 |
| Hotels MCP widget (`USE_MCP = true`)         | OK. Middleware injects `findHotels`, executes it after the turn, emits `mcp-apps` with `serverHash`; the iframe's `resources/read` proxy runs through the same route. Flag reverted to `false`.                                                                                                                                                                                                          |

Server-log noise: `[MastraAgent] Failed to compute new-message diff …
No thread found` on the first run of every thread (draft #6).
