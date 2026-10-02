# CopilotKit 0.5.0/0.5.1 upgrade plan

Status: all phases executed 2026-09-05 on branch `copilotkit-v0.5.0`
(working tree, not committed; see the execution log and verification results
at the end). Written 2026-09-04 from the GitHub release notes
(`angular/v0.5.0`, `angular/v0.5.1`), the underlying PRs (#6773, #6586,
#6098) and the published npm tarballs.
Target branch: `copilotkit-v0.5.0` (current).
Related docs: [copilotkit-0.4.0.md](copilotkit-0.4.0.md) (last executed
migration), [client-tools-and-components.md](client-tools-and-components.md),
`bridge.md` (deleted 2026-09-07; `git show 23bb6183:docs/bridge.md`).

## What 0.5.x contains

- **`registerComponent`** (PR #6773): a component can now be the tool itself —
  a display-only frontend tool with no handler, declared by the client and
  forwarded over AG-UI, so the agent needs nothing added server-side. Enabled
  by making `FrontendToolConfig.handler` optional; a tool without a handler
  gets an empty tool result and the turn completes.
- **Human-in-the-loop result fix** (PR #6586, behavioral break): `onResult`
  now resolves with the bare result the human supplied. Previously the agent
  received the bus envelope `{"toolCallId", "toolName", "result": …}`; agents
  or workarounds reading `.result` off the tool message must drop that.
- **Runtime entitlement signals** (PR #6098): `CopilotKit` exposes
  `runtimeEntitlements` and `runtimeEntitlementRetryPending`, sourced from the
  managed runtime's `/info` response. Managed-runtime concern only.
- **Dependency bumps**: `@ag-ui/client`/`@ag-ui/core` `0.0.59` (exact),
  `@copilotkit/{core,shared,web-components,web-inspector,a2ui-renderer}`
  `1.70.0`. 0.5.1 has no release notes; its only visible change is the core
  family at `1.70.1`. Peers unchanged: Angular `^22`, rxjs `^7.8` — both met.

AG-UI `0.0.57 → 0.0.59` is additive: `SUBAGENT_STARTED/FINISHED/ERROR`
events, `TokenUsage` (+ aggregation helpers), optional `metadata` on events,
messages and tool calls, optional `subagentRunId` on messages,
`AGUI_METADATA_KEY`. No removals in the public surface.

## Target versions

| Package                      | Current   | Target    | Note                                                       |
| ---------------------------- | --------- | --------- | ---------------------------------------------------------- |
| `@copilotkit/angular`        | `0.4.0`   | `0.5.1`   | exact, as before                                           |
| `@ag-ui/client`              | `0.0.57`  | `0.0.59`  | must match the exact pin inside `@copilotkit/angular`      |
| `@ag-ui/core`                | `0.0.57`  | `0.0.59`  | same                                                       |
| `@copilotkit/core` (dev)     | `^1.69.3` | `^1.70.1` | test helper `FrontendToolHandlerContext`                   |
| `@copilotkit/aimock` (dev)   | `^1.39.0` | keep      | `1.39.0` is latest; aimock specs are the compat smoke test |
| `@ag-ui/mcp-apps-middleware` | `0.0.3`   | keep      | latest; peer `@ag-ui/client >=0.0.40`                      |

The `@ag-ui/*` alignment is load-bearing: `@copilotkit/angular` pins
`0.0.59` exactly. A root pin left at `0.0.57` gives npm two installs, and
`AppHttpAgent extends HttpAgent` plus the `AbstractAgent` subclass in
`libs/ag-ui-server` would mix classes/types from both copies.

Unchanged and known: the SDK still nests its own zod `^3.25.75` next to the
root zod 4 — same situation as 0.4.0, no action (see the A2UI catalog-base
workaround).

## Impact on this repo

- **HITL envelope**: no store passes `humanInTheLoop` configs; interrupts are
  server-driven (Mastra suspend/resume via `injectInterrupt`, `tool_suspended`
  echo suppression in `AppHttpAgent`). The CopilotKit HITL bus is wired in
  `init-agent-store.ts` but unused, so the fix should be a no-op here — verify
  nothing on the Mastra side unwraps `{toolName, result}` from tool messages.
- **Entitlements**: we run `selfManagedAgents` only, no `runtimeUrl`, so no
  `/info` fetch is expected. Verify: no new network calls or console noise.
- **`libs/ag-ui-server`**: protocol delta is additive; expect a clean compile
  against `0.0.59`. Subagent events are picked up as optional phase F;
  `TokenUsage` / `metadata` stay out of scope.
- **`FrontendToolConfig.handler` optional**: type-level widening, existing
  tools unaffected. `createFrontendTool` in `tool-definition.ts` keeps
  compiling; whether the workshop wants a `createComponent` sibling is part of
  phase C.

## Phases

### Phase A — bump and build

1. Update the four pins in `package.json`, `npm install`.
2. Restore the `@internal` symlink (npm install prunes it; see
   ai-server runtime notes).
3. `tsc --build` for `libs/ag-ui-server` + ai-server, `ng build` for
   `flights` and `simple-client`.

### Phase B — behavioral verification

1. Grep ai-server and `libs/ag-ui-server` for envelope unwrapping
   (`toolName`+`result` on tool message content); expect none.
2. Run the ticketing flow with interrupts (approve/reject) against the local
   ai-server; confirm resume payloads unchanged.
3. Confirm no `/info` request and no entitlement retry logging with the
   inspector disabled (default) and enabled.

### Phase C — adopt `registerComponent` (workshop material, optional)

1. Extend `init-agent-store.ts` with a `components` option
   (`readonly RegisterComponentConfig<any>[]`) mapping to
   `registerComponent`, mirroring the existing tool/renderer funnels.
   `RegisterComponentConfig` carries `agentId`, so the funnel pattern
   transfers unchanged.
2. Add a `createComponentTool` identity helper in `tool-definition.ts` —
   same rationale as `createFrontendTool`: the file-per-tool pattern loses
   the `parameters` ↔ `component` `Args` inference without it. Not named
   `createComponent` (collides with `@angular/core`). Reuse the
   `TERMINAL_TOOL_HINT` logic for `followUp: false`; `description` is
   optional here, so the hint append must handle `undefined`.
3. One display-only demo component on an existing agent (candidate: a
   flight/hotel info card the agent can show without a server-side tool),
   as a new section in [client-tools-and-components.md](client-tools-and-components.md).
4. Leave existing `registerRenderToolCall` usages as they are — they render
   tools the agents really own.

### Phase F — surface sub-agent runs via SUBAGENT events (optional)

**Decision 2026-09-06: implemented, verified, then removed again.** The
mapping plus client tracker and chat status line touched eleven files for a
feature shown in one small chapter at the end; the churn was not worth it.
The workshop mentions the new events in passing instead. The findings below
(in the execution log) stay valid for a later attempt.

The ticketing agent delegates to `hotelAgent` as a Mastra sub-agent
(`ticketing-agent.ts`). Mastra emits `agent-execution-start` /
`agent-execution-step` / `agent-execution-end` / `agent-execution-suspended` /
`agent-execution-abort` chunks for that, which the `switch` in
`extended-mastra-agent.ts` currently drops — the delegation is visible only
as the wrapping tool call.

1. Map those chunks to the new AG-UI events: `agent-execution-start` →
   `SUBAGENT_STARTED` (`subagentRunId`, `name`, `parentToolCallId` = the
   delegating tool call), `agent-execution-end` → `SUBAGENT_FINISHED`
   (outcome `success`), `agent-execution-suspended` → outcome `suspended`,
   `agent-execution-abort` → `SUBAGENT_ERROR`.
2. Client rendering is our job: `@ag-ui/client` verifies and dispatches the
   events (subscriber hooks `onSubagentStartedEvent` etc.), but
   `@copilotkit/angular` 0.5.1 only re-exports the types and renders
   nothing. Hook into `agent-step-tracker.ts` / the custom chat UI.
3. Mind the strict client-side verification: `subagentRunId` unique per
   run, start-before-finish, parent must exist — violations raise
   `AGUIError` and abort the stream. Cover the mapping with an agui-mock /
   aimock spec before wiring it into the live route.

Optional in the same area, not planned here: `TokenUsage` and event/message
`metadata` are new in `0.0.59` and could feed the inspector/reporting story
later.

### Phase D — tests

1. Browser suite: `ng test` (Chromium runner).
2. Node suite: `npm run test:aimock` — this is the aimock ↔ core 1.70.x
   compatibility check.
3. `simple-client` + weather server smoke test (`CopilotChat` end to end).

### Phase E — wrap-up

1. Linter with `--fix`.
2. Record results in this file (verification section below); no commit —
   working tree stays open for review.

## Risks

- Duplicate `@ag-ui/*` installs if the exact pins drift from what
  `@copilotkit/angular` ships (see above) — check `package-lock.json` after
  install: each `@ag-ui/{client,core}` must appear once.
- `0.5.1` is unreleased-notes territory; if the core `1.70.1` family moved
  more than the version number, the aimock and agui-mock spec seams will
  surface it.
- Client on `0.0.59` schemas validating events from a server still emitting
  `0.0.57` shapes is safe (additive), but the reverse pin mismatch inside the
  monorepo is not — phase A step 3 covers it.

## Execution log

Deviations from the plan above, found while executing:

- **Phase A, step 2 is obsolete.** Since commit `013fd033` the ai-server is
  pure TS: `ai-server/tsconfig.json` has `noEmit`, the Mastra bundler resolves
  `@internal/ag-ui-server` through the tsconfig paths, and no
  `node_modules/@internal` symlink is needed. The ai-server runtime notes that
  describe the symlink and the in-place `.js` output are outdated.
- **Phase F (reverted): `agents:` delegation does not emit
  `agent-execution-*` chunks.** Those chunks come from `Agent.network()` only
  (`from: "NETWORK"`). A sub-agent registered via `agents: { hotelAgent }` is
  exposed to the model as the tool `agent-hotelAgent` (`listAgentTools` in
  `@mastra/core`); its inner chunks are forwarded through the tool `writer`
  and never reach the parent's `fullStream` as first-class events. A working
  mapping therefore keys on the delegation tool call: `tool-call` for a name
  in `listAgents()` → `SUBAGENT_STARTED` (`subagentRunId =
subagent:<toolCallId>`, `parentToolCallId`, `parentMessageId`),
  `tool-result` → `SUBAGENT_FINISHED` (`outcome.success`), `tool-error` and
  the "finished without a streamed result" path → `SUBAGENT_ERROR`,
  `tool-call-suspended` → `SUBAGENT_FINISHED` with `outcome.suspended`. This
  was implemented and verified live (wire sequence
  `TOOL_CALL_START(agent-hotelAgent) … SUBAGENT_STARTED, SUBAGENT_FINISHED, TOOL_CALL_RESULT`,
  client verifier happy, status line in the chat), then removed again — see
  the decision under Phase F. Useful bits if it comes back: `@ag-ui/client`
  exports `verifyEvents`, so a Node spec can pipe the server's events through
  the strict client verifier; `@copilotkit/angular` 0.5.1 renders nothing for
  SUBAGENT events, the client side is entirely an own `AgentSubscriber`
  (`onSubagentStartedEvent` etc.); lib specs under `libs/` need
  `../libs/**/*.node.spec.ts` in the `test-node` include, the lib in
  `tsconfig.spec.json` and a `*.spec.ts` exclude in `ai-server/tsconfig.json`.
- **`FrontendToolConfig.handler` optional broke one spec.**
  `toggle-flight-selection.tool.spec.ts` called `tool.handler(...)` directly;
  it now narrows through a small `handlerOf` helper.
- **The weather demo server was already broken.** `ai-demo/server/chat-route.ts`
  still imported `MastraAgent` from `@ag-ui/mastra`, which the 0.4.0
  migration removed from the repo (that migration only verified
  `ng build simple-client`, not the runtime). Phase D step 3 needs a running
  server, so the route now uses `getExtendedLocalAgent` from
  `libs/ag-ui-server` via a relative import (the `ai-demo` tsconfig has no
  `paths`). Re-adding `@ag-ui/mastra` would be possible again on 0.0.59 but
  still needs the `@copilotkit/runtime` peer override — not done here.
- **Inspector** (0.4.0 and 0.5.1 alike) fetches
  `https://cdn.copilotkit.ai/announcements.json` when enabled. Not an
  entitlement call; recorded here so nobody mistakes it for one.

Files touched:

| Area                                   | Change                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | `@copilotkit/angular` 0.5.1, `@ag-ui/client`/`core` 0.0.59, `@copilotkit/core` ^1.70.1                               |
| `tool-definition.ts`                   | `createComponentTool` (identity helper for `RegisterComponentConfig`), terminal hint tolerates a missing description |
| `init-agent-store.ts`                  | `components` option → `registerComponent` funnel                                                                     |
| `destination-info-card.ts`             | display-only demo component on the ticketing agent (`destinationInfoCard`, `followUp: false`, no handler)            |
| `ticketing-agent-store.ts`             | registers `destinationInfoCard` via `components`                                                                     |
| `toggle-flight-selection.tool.spec.ts` | narrows the now-optional `handler` through `handlerOf`                                                               |
| docs                                   | `client-tools-and-components.md` — new section 4 on `registerComponent`                                              |
| `ai-demo/server`                       | `chat-route.ts` uses `getExtendedLocalAgent` instead of the removed `@ag-ui/mastra` (see log)                        |

## Verification results

### Phase A — bump and build

- `npm install`: 11 packages changed. `npm ls @ag-ui/client @ag-ui/core`
  shows a single `0.0.59` for each (deduped across `@copilotkit/angular`,
  `@copilotkit/core`, `@copilotkit/shared`, `@copilotkit/web-inspector`,
  `@ag-ui/mcp-apps-middleware`). No `0.0.57` left in the tree.
- `@copilotkit/angular@0.5.1` still nests its own `zod@3` and `marked`
  (`node_modules/@copilotkit/angular/node_modules`) — unchanged from 0.4.0.
- `tsc --build ai-server/tsconfig.json`: clean. `ng build` (flights) and
  `ng build simple-client`: clean, only the known CommonJS warnings
  (`chalk`, `node-fetch` via `@copilotkit/shared` telemetry).

### Phase B — behavioral verification

- Grep for envelope unwrapping (`toolName` + `result` read off tool message
  content) in `ai-server/src` and `libs/ag-ui-server`: none. The only `.result`
  reads are dashboard-DSL internals.
- Ticketing flow against the local ai-server (Playwright, execution mode):
  "Which flights have I booked?" renders the booked flight widgets; "Book
  flight 3" suspends with the payment options; approving sends
  `resume: [{ interruptId: "suspend:<runId>:<toolCallId>", status: "resolved", payload: { selection: "creditCard" } }]`
  and the booking completes; "Book flight 4" + Cancel sends
  `payload: { selection: "cancel" }` and the agent reports the cancellation.
  Payload shapes are identical to 0.4.0 (bare selection object, no envelope).
- Inspector disabled (default): zero `/info` requests, zero
  entitlement/license console output, zero console errors across the whole
  flow. Inspector enabled (`enableInspector: true`, temporarily): the
  `cpk-web-inspector` element mounts, still zero `/info` requests and no
  entitlement logging; the only extra request is the announcements JSON
  mentioned above.

### Phase C — `registerComponent`

- Live: "What is Rome like as a destination? Show me a destination info
  card." → the model calls `destinationInfoCard` (visible as
  `TOOL_CALL_START` on the wire, nothing added server-side), the card renders
  with city, country, summary and highlights, the turn ends
  (`followUp: false`).

### Phase F — SUBAGENT events

- Implemented and verified live on 2026-09-05, reverted on 2026-09-06 (see
  the decision under Phase F and the execution log). The hotel delegation
  is on the wire as before: `TOOL_CALL_START(agent-hotelAgent)` …
  `TOOL_CALL_RESULT`, no SUBAGENT events.

### Phase D — tests

1. Browser suite: `ng test` (Chromium runner).
2. Node suite: `npm run test:aimock` — this is the aimock ↔ core 1.70.x
   compatibility check.
3. `simple-client` + weather server smoke test (`CopilotChat` end to end).

### Phase E — wrap-up

1. Linter with `--fix`.
2. Record results in this file (verification section below); no commit —
   working tree stays open for review.

## Risks

- Duplicate `@ag-ui/*` installs if the exact pins drift from what
  `@copilotkit/angular` ships (see above) — check `package-lock.json` after
  install: each `@ag-ui/{client,core}` must appear once.
- `0.5.1` is unreleased-notes territory; if the core `1.70.1` family moved
  more than the version number, the aimock and agui-mock spec seams will
  surface it.
- Client on `0.0.59` schemas validating events from a server still emitting
  `0.0.57` shapes is safe (additive), but the reverse pin mismatch inside the
  monorepo is not — phase A step 3 covers it.

## Execution log

Deviations from the plan above, found while executing:

- **Phase A, step 2 is obsolete.** Since commit `013fd033` the ai-server is
  pure TS: `ai-server/tsconfig.json` has `noEmit`, the Mastra bundler resolves
  `@internal/ag-ui-server` through the tsconfig paths, and no
  `node_modules/@internal` symlink is needed. The ai-server runtime notes that
  describe the symlink and the in-place `.js` output are outdated.
- **Phase F (reverted): `agents:` delegation does not emit
  `agent-execution-*` chunks.** Those chunks come from `Agent.network()` only
  (`from: "NETWORK"`). A sub-agent registered via `agents: { hotelAgent }` is
  exposed to the model as the tool `agent-hotelAgent` (`listAgentTools` in
  `@mastra/core`); its inner chunks are forwarded through the tool `writer`
  and never reach the parent's `fullStream` as first-class events. A working
  mapping therefore keys on the delegation tool call: `tool-call` for a name
  in `listAgents()` → `SUBAGENT_STARTED` (`subagentRunId =
subagent:<toolCallId>`, `parentToolCallId`, `parentMessageId`),
  `tool-result` → `SUBAGENT_FINISHED` (`outcome.success`), `tool-error` and
  the "finished without a streamed result" path → `SUBAGENT_ERROR`,
  `tool-call-suspended` → `SUBAGENT_FINISHED` with `outcome.suspended`. This
  was implemented and verified live (wire sequence
  `TOOL_CALL_START(agent-hotelAgent) … SUBAGENT_STARTED, SUBAGENT_FINISHED, TOOL_CALL_RESULT`,
  client verifier happy, status line in the chat), then removed again — see
  the decision under Phase F. Useful bits if it comes back: `@ag-ui/client`
  exports `verifyEvents`, so a Node spec can pipe the server's events through
  the strict client verifier; `@copilotkit/angular` 0.5.1 renders nothing for
  SUBAGENT events, the client side is entirely an own `AgentSubscriber`
  (`onSubagentStartedEvent` etc.); lib specs under `libs/` need
  `../libs/**/*.node.spec.ts` in the `test-node` include, the lib in
  `tsconfig.spec.json` and a `*.spec.ts` exclude in `ai-server/tsconfig.json`.
- **`FrontendToolConfig.handler` optional broke one spec.**
  `toggle-flight-selection.tool.spec.ts` called `tool.handler(...)` directly;
  it now narrows through a small `handlerOf` helper.
- **The weather demo server was already broken.** `ai-demo/server/chat-route.ts`
  still imported `MastraAgent` from `@ag-ui/mastra`, which the 0.4.0
  migration removed from the repo (that migration only verified
  `ng build simple-client`, not the runtime). Phase D step 3 needs a running
  server, so the route now uses `getExtendedLocalAgent` from
  `libs/ag-ui-server` via a relative import (the `ai-demo` tsconfig has no
  `paths`). Re-adding `@ag-ui/mastra` would be possible again on 0.0.59 but
  still needs the `@copilotkit/runtime` peer override — not done here.
- **Inspector** (0.4.0 and 0.5.1 alike) fetches
  `https://cdn.copilotkit.ai/announcements.json` when enabled. Not an
  entitlement call; recorded here so nobody mistakes it for one.

Files touched:

| Area                                   | Change                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | `@copilotkit/angular` 0.5.1, `@ag-ui/client`/`core` 0.0.59, `@copilotkit/core` ^1.70.1                               |
| `tool-definition.ts`                   | `createComponentTool` (identity helper for `RegisterComponentConfig`), terminal hint tolerates a missing description |
| `init-agent-store.ts`                  | `components` option → `registerComponent` funnel                                                                     |
| `destination-info-card.ts`             | display-only demo component on the ticketing agent (`destinationInfoCard`, `followUp: false`, no handler)            |
| `ticketing-agent-store.ts`             | registers `destinationInfoCard` via `components`                                                                     |
| `toggle-flight-selection.tool.spec.ts` | narrows the now-optional `handler` through `handlerOf`                                                               |
| docs                                   | `client-tools-and-components.md` — new section 4 on `registerComponent`                                              |
| `ai-demo/server`                       | `chat-route.ts` uses `getExtendedLocalAgent` instead of the removed `@ag-ui/mastra` (see log)                        |

## Verification results

### Phase A — bump and build

- `npm install`: 11 packages changed. `npm ls @ag-ui/client @ag-ui/core`
  shows a single `0.0.59` for each (deduped across `@copilotkit/angular`,
  `@copilotkit/core`, `@copilotkit/shared`, `@copilotkit/web-inspector`,
  `@ag-ui/mcp-apps-middleware`). No `0.0.57` left in the tree.
- `@copilotkit/angular@0.5.1` still nests its own `zod@3` and `marked`
  (`node_modules/@copilotkit/angular/node_modules`) — unchanged from 0.4.0.
- `tsc --build ai-server/tsconfig.json`: clean. `ng build` (flights) and
  `ng build simple-client`: clean, only the known CommonJS warnings
  (`chalk`, `node-fetch` via `@copilotkit/shared` telemetry).

### Phase B — behavioral verification

- Grep for envelope unwrapping (`toolName` + `result` read off tool message
  content) in `ai-server/src` and `libs/ag-ui-server`: none. The only `.result`
  reads are dashboard-DSL internals.
- Ticketing flow against the local ai-server (Playwright, execution mode):
  "Which flights have I booked?" renders the booked flight widgets; "Book
  flight 3" suspends with the payment options; approving sends
  `resume: [{ interruptId: "suspend:<runId>:<toolCallId>", status: "resolved", payload: { selection: "creditCard" } }]`
  and the booking completes; "Book flight 4" + Cancel sends
  `payload: { selection: "cancel" }` and the agent reports the cancellation.
  Payload shapes are identical to 0.4.0 (bare selection object, no envelope).
- Inspector disabled (default): zero `/info` requests, zero
  entitlement/license console output, zero console errors across the whole
  flow. Inspector enabled (`enableInspector: true`, temporarily): the
  `cpk-web-inspector` element mounts, still zero `/info` requests and no
  entitlement logging; the only extra request is the announcements JSON
  mentioned above.

### Phase C — `registerComponent`

- Live: "What is Rome like as a destination? Show me a destination info
  card." → the model calls `destinationInfoCard` (visible as
  `TOOL_CALL_START` on the wire, nothing added server-side), the card renders
  with city, country, summary and highlights, the turn ends
  (`followUp: false`).

### Phase F — SUBAGENT events

- Live: "Which hotels are there in Rome?" → wire sequence
  `RUN_STARTED, TOOL_CALL_START(agent-hotelAgent), TOOL_CALL_ARGS, TOOL_CALL_END, SUBAGENT_STARTED, SUBAGENT_FINISHED, TOOL_CALL_RESULT, TOOL_CALL_START(messageWidget), 3× hotelWidget, RUN_FINISHED`.
  The chat shows "Delegated to hotelAgent …" (pulsing) while the sub-agent
  runs and "hotelAgent finished" afterwards. No client-side `AGUIError`.
- Unit: the Node spec pipes the server's events through `verifyEvents` from
  `@ag-ui/client` (strict mode), so start-before-finish, unique run ids and
  "no active subagent at RUN_FINISHED" are checked on every run.

### Phase D — tests

- `ng test --configuration ci` (Chromium headless): 10 files, 25 tests
  passed.
- `npm run test:aimock` (Node): 1 file, 3 tests passed — the aimock specs
  against `@copilotkit/core` 1.70.1.
- `simple-client` + weather server (`npm run ai-demo-server`,
  `ng serve simple-client`, Playwright): "What is the weather in Rome?"
  through `CopilotChat` → wire
  `RUN_STARTED, TOOL_CALL_START/ARGS/END, TOOL_CALL_RESULT, TEXT_MESSAGE_CHUNK…, RUN_FINISHED`,
  reply rendered ("Rome is cloudy with a temperature of 21°C."), no console
  errors. Note: only one `mastra dev` runs at a time — stop the flights
  ai-server first.

### Phase E — wrap-up

- `ng lint --fix`: all three projects pass.
- Nothing committed; working tree left for review.
