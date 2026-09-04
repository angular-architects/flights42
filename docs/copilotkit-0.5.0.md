# CopilotKit 0.5.0/0.5.1 upgrade plan

Status: planned, not executed. Written 2026-09-04 from the GitHub release
notes (`angular/v0.5.0`, `angular/v0.5.1`), the underlying PRs (#6773, #6586,
#6098) and the published npm tarballs.
Target branch: `copilotkit-v0.5.0` (current).
Related docs: [copilotkit-0.4.0.md](copilotkit-0.4.0.md) (last executed
migration), [client-tools-and-components.md](client-tools-and-components.md),
[bridge.md](bridge.md).

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

## Verification results

_To be filled in during execution._
