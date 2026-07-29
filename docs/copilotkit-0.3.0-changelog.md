# CopilotKit 0.3.0 migration — changelog

Executed 2026-07-29 on branch `copilotkit-v0.3.0`, following the plan and
protocol in [copilot-migration.md](copilot-migration.md) (§8 plus its
Migration log). This document lists every change so the book and the training
slides based on this repo can be updated. Section numbers match the migration
steps; §3 is the section referenced from the migration log.

Dependency baseline: `@copilotkit/angular` 0.2.0 → **0.3.0** (core
1.63.1 → 1.63.2), **added** `@ag-ui/mcp-apps-middleware@0.0.3`, **removed**
`@copilotkit/runtime` (was declared, never imported). `@ag-ui/client` stays at
0.0.57, `@ag-ui/mastra` stays pinned at 1.0.0, zod stays at 4.x.

## Quick reference for book/slides

| If the material shows…                                               | It changes to…                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `FallbackToolCard` / `'*'` wildcard renderer                         | gone — `provideCopilotKit({ defaultToolRendering: true })`                     |
| `getPendingInterrupts(store)` + signal-priming trick                 | `injectInterrupt({ agentId })` controller, `controller.interrupts()`           |
| `resumeInterrupt(copilotKit, store, responses)` / `buildResumeArray` | `controller.resolve(payload, interruptId)`                                     |
| `context: () => [...]` option on `initAgentStore`                    | gone — `connectAgentContext` with `agentIds` scoping inside `initAgentStore`   |
| `catalogToContextEntry(...)` in agent stores                         | stores no longer mention the catalog; app-wide `sendCatalogDescription` switch |
| custom MCP Apps host (`mcp-apps/` folder, `provideMcpApps`)          | `provideMCPApps()` from `@copilotkit/angular/mcp-apps`                         |
| browser connects to MCP server (`ConfigService.mcpServerUrl`)        | widget traffic is proxied through the AG-UI agent (`__proxiedMCPRequest`)      |
| `@copilotkit/runtime` in `package.json`                              | removed; `@ag-ui/mcp-apps-middleware` added (server-side proxy only)           |

## 1. Upgrade and default tool rendering

- `@copilotkit/angular` pinned to `0.3.0` in [package.json](../package.json).
- [app.config.ts](../src/app/app.config.ts) now passes
  `defaultToolRendering: true` to `provideCopilotKit`. Tools without an own
  renderer component fall through to CopilotKit's built-in
  `CopilotDefaultToolRenderer` — a collapsible tool card functionally
  equivalent to our previous `FallbackToolCard`.
- **Deleted:** `src/app/domains/shared/util-copilotkit/fallback-tool-card.ts`
  (component plus the `'*'` wildcard `fallbackToolCard` config).
- [init-agent-store.ts](../src/app/domains/shared/util-copilotkit/init-agent-store.ts):
  removed the `component: tool.component || FallbackToolCard` default when
  registering frontend tools and the register-`'*'`-if-absent logic.
- [widget-tool-names.ts](../src/app/domains/shared/util-copilotkit/widget-tool-names.ts):
  the widget discriminator changed from
  `component !== FallbackToolCard` to `component !== undefined`.
- The D1.4 rewiring of
  [copilot-activity.ts](../src/app/domains/shared/util-copilotkit/activity/copilot-activity.ts)
  (consume `copilotKit.activityMessageRenderConfigs()`, pass the new `agent`
  input to renderers) was already on this branch before the migration. That
  computed also merges the `ɵCOPILOTKIT_BUILT_IN_ACTIVITY_RENDERERS`
  multi-token, which is what makes §4's `provideMCPApps()` renderer reachable
  from the custom chat shell. `CopilotActivity` itself stays until upstream
  PR #6033 lands.

## 2. Interrupts: `injectInterrupt` replaces the hand-written protocol

Client-side only; the server-side interrupt protocol
(`RUN_FINISHED { outcome: { type: 'interrupt', ... } }`, resume array,
`approveToolCall`/`declineToolCall`/`resumeStream`) is unchanged.

- [assistant-chat.ts](../src/app/domains/shared/ui-assistant/assistant-chat/assistant-chat.ts)
  owns an `injectInterrupt` controller with a reactive `agentId`
  (follows the `ChatRegistry` chat switch). `interrupts` renders from
  `controller.interrupts()`, gated on `!isRunning()` so the buttons vanish
  the moment the resume run starts. `onResumeInterrupt` calls
  `controller.resolve(payload, interruptId)`.
- **Deleted from**
  [agent-store-helper.ts](../src/app/domains/shared/util-copilotkit/agent-store-helper.ts):
  `getPendingInterrupts` (the signal-priming hack that read `isRunning()` and
  `messages()` only to force recomputation) and
  `resumeInterrupt`/`InterruptResponses` (the `buildResumeArray` plumbing).
- **Deleted from**
  [chat-messages.ts](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts):
  the `resolvedInterruptId` optimistic-hiding signal. The interrupt _view_
  mapping (`metadata.suspendPayload` → message + option buttons) stays —
  application knowledge, per D5.
- The controller adds for free: multi-interrupt gating, thread-change
  clearing, resume-in-flight de-duplication, `InterruptExpiredError`.
- **D5.1 (real, mitigated):** on resolve, the controller appends a synthetic
  client-side `role: 'tool'` message built from `decision.toolResults` for
  interrupts that carry a `toolCallId` (ours always do). Client-side,
  `RenderToolCalls` resolves tool results first-match, so the synthetic
  `{"selection":…}` message would shadow the real booking result and flip the
  action card to "Failed". Mitigation in
  [app-http-agent.ts](../src/app/domains/shared/util-copilotkit/app-http-agent.ts):
  `addMessage` drops tool messages whose `toolCallId` matches a pending
  interrupt, gated on the reasons our server emits (`human_approval`,
  `tool_suspended`) — Mastra remains the single source of the tool result. A
  future CopilotKit-style interrupt-tool demo (other reasons) would keep its
  synthesis. Upstream issue #6201 proposes gating the synthesis in CopilotKit.
- **D5.2:** the controller's resume sends only `{ resume }`; forwarded props
  (agent mode) survive because `AppHttpAgent.requestInit` injects persistent
  `forwardedProps` into every request. The interrupt migration therefore
  depends on keeping `AppHttpAgent` (or on upstream PR #6076).
- Gate evidence: a temporary spec drove the full roundtrip against the
  `agui-mock` SSE infrastructure — the controller surfaces the interrupt with
  `metadata.suspendPayload`, `resolve({ selection: 'creditCard' })` posts
  exactly the resume array the old path sent
  (`[{ interruptId, status: 'resolved', payload }]`), and afterwards exactly
  one tool message (the server's) exists for the tool call. A negative check
  (guard disabled) reproduced the shadowing, confirming the mitigation is
  load-bearing. The spec was removed after the gate; the three teaching spec
  variants stay untouched.

## 3. Agent context: `connectAgentContext` replaces the context merge

- Catalog context entries moved out of `AppHttpAgent` into a single
  `connectAgentContext(() => ({ ...entry, agentIds: [agentId] }))` inside
  [init-agent-store.ts](../src/app/domains/shared/util-copilotkit/init-agent-store.ts).
  The facade injects the catalog (`inject(A2UI_CUSTOM_CATALOG, { optional:
true })`) and serializes it, so the agent stores no longer mention the
  catalog at all.
- Per-agent scoping works via `ScopedContext.agentIds` (core 1.63.2,
  PR #5369): `core.runAgent` builds `input.context` through
  `ContextStore.getContextForAgent(agentId)`. The server-side extraction by
  the `'A2UI Custom Catalog'` description string is unchanged.
- **Deleted:** the `context` option in `InitAgentStoreConfig`, the context
  factory plumbing, and `mergePersistentContext` in
  [app-http-agent.ts](../src/app/domains/shared/util-copilotkit/app-http-agent.ts);
  `buildCatalogContext()` in
  [ticketing-agent-store.ts](../src/app/domains/ticketing/ai/ticketing-agent-store.ts)
  and `buildCatalogIdContext()` in
  [dashboard-agent-store.ts](../src/app/shell/dashboard/dashboard-agent-store.ts).
- **Behavioral change:** full descriptor vs. catalog id is now an app-wide
  switch (`provideA2uiCatalog(catalog, { sendCatalogDescription })`), not a
  per-agent one. The earlier split (ticketing full catalog, dashboard id
  only) is gone; the app runs on `sendCatalogDescription: false`, so **both
  agents send `{ catalogId, components: {} }`** and the custom-component
  prompt section is no longer expanded from client-supplied metadata — the
  production posture where the server would own a trusted catalog registry.
  Set the flag to `true` to restore the demo where the client announces the
  full catalog.
- The `sendCatalogDescription` mechanics in
  [provide-a2ui-catalog.ts](../src/app/domains/shared/util-copilotkit/a2ui/provide-a2ui-catalog.ts)
  are unchanged from before the migration: with `false`, the descriptor
  stored at `A2UI_CUSTOM_CATALOG` is stripped to `{ id, components: [] }`
  (serializing to `{ catalogId, components: {} }`); the renderer keeps the
  full catalog in every case.
- **D8.2 decided — the pull-model `state` factory stays.** The documented
  `agent.setState()` push variant is a feedback loop with the existing mirror
  effect (`setState` → `onStateChanged` → store mirror → new refs → push
  effect fires again). Making push safe would need deep-equality guards on
  both sides — more custom code than the one-line factory it would replace.
  PR #6076 should keep covering the `state` factory.
- `AppHttpAgent` is now down to: persistent `forwardedProps`, the `state`
  factory, the server-memory history filter, and the two guards from §2/§4.

## 4. MCP Apps: official frontend, hybrid server (adopted)

The 0.3.0 frontend is adopted; on the server, MCP tools stay registered at
_agent level_ (native `MCPClient.listTools()` execution, mid-run — "Mastra
Bordmittel first"). `MCPAppsMiddleware` is used **solely** as a proxy for
widget-originated `__proxiedMCPRequest` runs (no agent, no LLM involved).

Client:

- **Deleted** the entire custom host:
  `src/app/domains/shared/util-copilotkit/mcp-apps/` (`mcp-apps-widget.ts`,
  `mcp-apps-activity-renderer.ts`, `mcp-apps-content.ts`,
  `mcp-apps.provider.ts` with `provideMcp`/`provideMcpApps`).
- [app.config.ts](../src/app/app.config.ts) instead calls
  `provideMCPApps(mcpAppsConfig)` from `@copilotkit/angular/mcp-apps`.
  [mcp-apps.config.ts](../src/app/mcp-apps.config.ts) keeps its path but its
  `mcpAppsConfig` is now typed with the official `MCPAppsConfig`
  (`hostInfo`/`hostContext`) instead of our deleted `McpAppsConfig`. The
  shipped renderer registers via the built-in multi-token and is picked up by
  `CopilotActivity` (§1).
- The shipped widget proxies every `resources/read` / `tools/call` through
  the AG-UI agent as
  `runAgent({ forwardedProps: { __proxiedMCPRequest: { serverHash, serverId?,
method, params } } })` — the browser no longer connects to the MCP server.
- New guard in
  [app-http-agent.ts](../src/app/domains/shared/util-copilotkit/app-http-agent.ts):
  the server-memory filter (and the `onRunFinalized` mark-as-sent) is skipped
  for `__proxiedMCPRequest` runs, so a concurrent widget refresh can never
  mark a user message as sent before the model saw it.

Server:

- [extended-mastra-agent.ts](../libs/ag-ui-server/extended-mastra-agent.ts)
  keeps the `_meta.ui` sniffing over natively registered `@mastra/mcp` tools
  and keeps emitting the `mcp-apps` `ACTIVITY_SNAPSHOT` itself — now
  including the `serverHash` the 0.3.0 renderer requires. The hash arrives
  via the new `mcpAppsServerHashes` option (serverId → hash).
- [ag-ui-route.ts](../ai-server/src/mastra/routes/ag-ui-route.ts) declares
  the hotels MCP server config once (`type: 'http'`, url, explicit
  `serverId: 'hotels'` per D6), derives the hash with `getServerHash` over
  that same config (so hash-based lookups resolve), passes the hash map to
  the agent, and routes `__proxiedMCPRequest` runs through a module-level
  `MCPAppsMiddleware` instead of the agent.
- [ag-ui-stream.ts](../ai-server/src/mastra/routes/ag-ui-stream.ts):
  `streamAgentEvents` gained an optional `middleware` and subscribes to
  `middleware.run(input, agent)` when set.
- [ticketing-agent.ts](../ai-server/src/mastra/agents/ticketing-agent.ts) is
  unchanged: native registration (`hotels_findHotels`), module-level
  `listTools()` await, and with it the :3002 startup dependency.
- CORS / private-network-access headers on the MCP server are no longer
  needed by the flights app (kept only for the browser-side `mcp-apps-demo`);
  `ConfigService.mcpServerUrl` is no longer used by the app.

Gate evidence (no LLM key needed): ai-server boots against the live MCP
server; proxied `tools/call` (by serverId) and `resources/read` (by real
serverHash) returned live results through the `mastra dev` route (hotel list
resp. the ~345 kB app HTML); a scripted `ExtendedMastraAgent` run (fake agent
emitting a `hotels_findHotels` call) produced the `mcp-apps`
`ACTIVITY_SNAPSHOT` with real `serverHash`, `serverId`, `resourceUri`,
`toolInput`, and a faithful `CallToolResult`; a temporary browser spec
validated that snapshot against the _shipped_ `mcpAppsSnapshotContentSchema`
(removed again after the gate). The LLM-driven hotels chat should be
eyeballed once — the tool executes mid-run as before, but the widget renders
through the new pipeline.

## 5. A2UI: descoped (unchanged)

CopilotKit 0.3.0 catalogs are Lit-only (`Catalog<LitComponentImplementation>`,
D2), so Angular custom catalogs cannot move. `@a2ui/angular/v0_9`, the custom
catalog base, the action bridge, and the server-side prompt expansion all
stay. Revisit only if upstream PRs #6072/#6073 land.

## 6. Housekeeping

- `@copilotkit/runtime` removed from `package.json` (never imported; D3).
  Bonus: `@segment/analytics-node` no longer appears in build output.
  `@ag-ui/mcp-apps-middleware@0.0.3` (tiny: rxjs + MCP SDK) added instead.
- Renaming our `provideMcpApps` became moot — §4 deleted it.
- `a2ui-*` styling classes: the v0_9 renderer already emits semantic classes
  (`a2ui-column`, `a2ui-text-body`, …) that `styles.css` targets; the
  activity wrapper
  ([a2ui-activity-renderer.ts](../src/app/domains/shared/util-copilotkit/a2ui/a2ui-activity-renderer.ts))
  now additionally carries the stable `a2ui-surface` host class.
- `@ag-ui/mastra` multimodal re-test: 1.1.1 fixes the non-text-part stripping
  but peer-depends on `@copilotkit/runtime@^1.60.1` (verified against the npm
  registry) and `@mastra/core >= 1.29`. Pin stays at 1.0.0; the server-side
  multimodal re-injection workaround in `extended-mastra-agent.ts` stays.

## Verification

Every step gated on: `ng build` (flights, simple-client),
`tsc --build ai-server/tsconfig.json`, `ng lint`, the browser test suite, and
the aimock node suite — all green before and after every step, with one
pre-existing exception: `a2ui-activity-renderer.spec.ts` fetches the a2ui
basic catalog from the network, which the session sandbox blocks; that
failure is identical before and after every step. The dev server boots and
serves. A commit
(`feat: migrate to @copilotkit/angular 0.3.0 (steps 1-3)`) captures the state
before the MCP Apps step, per protocol.

Open: re-check the two LLM-driven flows manually once (booking approval via
`injectInterrupt`, hotels via MCP Apps) — this session had no model API key;
everything up to the LLM was exercised mechanically.

## Post-migration fixes (2026-07-29, unrelated to 0.3.0)

Found while live-testing the hotels flow; both bugs predate the migration.

- **Mastra `tool-error` chunks were swallowed.**
  `ExtendedMastraAgent.streamMastraAgent` did not handle the `tool-error`
  chunk type, so a failing tool surfaced only as the generic "Tool execution
  finished without a streamed result." It now emits the actual error message
  as the `TOOL_CALL_RESULT`.
- **Mixed tool batches lose server-side calls.** When the model emits a
  server-side tool call (e.g. `hotels_findHotels`) and a client widget call
  (e.g. `messageWidget`) in the _same_ assistant batch, Mastra ends the turn
  without executing the server-side tool at all — no result, no error, no
  MCP Apps widget (reproduced against Mastra 1.14 with a mock model; a
  server-tools-only batch executes fine). Two mitigations: the
  `TERMINAL_TOOL_HINT` in
  [tool-definition.ts](../src/app/domains/shared/util-copilotkit/tool-definition.ts)
  now explicitly forbids mixing widgets with non-widget tools in one batch,
  and `ExtendedMastraAgent` finalizes **all** pending server-side tool calls
  at run end (previously only the last active one) with an explanatory error
  result, so a dropped call shows up in the chat instead of vanishing.
  Candidate for an upstream Mastra issue.
