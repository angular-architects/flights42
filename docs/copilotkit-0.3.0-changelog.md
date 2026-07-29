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

| If the material shows…                                               | It changes to…                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `FallbackToolCard` / `'*'` wildcard renderer                         | gone — `provideCopilotKit({ defaultToolRendering: true })`                    |
| `getPendingInterrupts(store)` + signal-priming trick                 | `injectInterrupt({ agentId })` in the chat service, `controller.interrupts()` |
| `chatRegistry.setChat(store, greeting, showModeSelector)`            | `chatRegistry.setChat({ store, interrupts, greeting, showModeSelector })`     |
| `resumeInterrupt(copilotKit, store, responses)` / `buildResumeArray` | `controller.resolve(payload, interruptId)`                                    |
| `context: () => [...]` option on `initAgentStore`                    | gone — `connectAgentContext` with `agentIds` scoping inside `initAgentStore`  |
| `catalogToContextEntry(...)` in agent stores                         | stores no longer mention the catalog; dashboard sets `catalogIdOnly: true`    |
| custom MCP Apps host (`mcp-apps/` folder, `provideMcpApps`)          | `provideMCPApps()` from `@copilotkit/angular/mcp-apps`                        |
| browser connects to MCP server (`ConfigService.mcpServerUrl`)        | widget traffic is proxied through the AG-UI agent (`__proxiedMCPRequest`)     |
| `@copilotkit/runtime` in `package.json`                              | removed; `@ag-ui/mcp-apps-middleware` added (server-side proxy only)          |

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
- **Styling follow-up (2026-07-29).** `CopilotDefaultToolRenderer` ships its
  own card chrome (`:host { margin-block: .5rem }`, bordered/filled
  `.tool-card`, padded `.tool-summary`) — inside our chat bubble that reads as
  a box in a box, unlike the old `FallbackToolCard`, whose styling we owned.
  [chat-messages.css](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.css)
  now neutralizes it via three `copilot-render-tool-calls ::ng-deep` rules
  (margin/padding, `border: 0` + `background: inherit`, summary padding). Host
  scoping makes them win on specificity, so no `!important`. Point for the
  book/slides: adopting the built-in renderer trades a component you style
  directly for one you can only reach through `::ng-deep`.
- The per-tool-call view mapping in
  [chat-messages.ts](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts)
  (one `RenderToolCalls` host per tool call) moved out of `toMessageViews`
  into its own `toToolCallViews` helper — cosmetic, no behavior change.
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

- The controller belongs to the chat service that owns the agent:
  [ticketing-chat-service.ts](../src/app/domains/ticketing/ai/ticketing-chat-service.ts)
  and
  [travel-refinement-chat-service.ts](../src/app/domains/ticketing/feature-travel-planner/travel-refinement-chat-service.ts)
  each call `injectInterrupt({ agentId })` right below their
  `inject…AgentStore()` — field order matters, because that store call is what
  registers the agent the controller resolves. The stores export their ids
  (`TICKETING_AGENT_ID`, `TRAVEL_REFINEMENT_AGENT_ID`) for it.
  `ChatRegistry.setChat` takes a `ChatConfig` object (`store`, `interrupts`,
  `greeting?`, `showModeSelector?`) instead of three positional arguments and
  carries the controller to
  [assistant-chat.ts](../src/app/domains/shared/ui-assistant/assistant-chat/assistant-chat.ts),
  which only renders it: `interrupts` from `controller.interrupts()`, gated on
  `!isRunning()` so the buttons vanish the moment the resume run starts;
  `onResumeInterrupt` calls `controller.resolve(payload, interruptId)`.
- **Why not in the chat component (fixed 2026-07-29).** The first cut had
  `AssistantChat` itself call `injectInterrupt({ agentId: this.agentId })`,
  with `agentId` a signal that stays `undefined` until `ChatRegistry`
  announces a chat. `injectInterrupt` resolves `agentId() || DEFAULT_AGENT_ID`
  eagerly and its connect effect hits `injectAgentStore('default')` — at app
  start no agent is registered, so the effect throws _"Agent 'default' not
  found after runtime sync (no runtimeUrl)"_ on every load. The signature
  invites it: `agentId?: string | Signal<string | undefined>` accepts
  `undefined`, but the runtime has no "not connected yet" state. Creating the
  controller lazily on the first real agent id works but needs
  `runInInjectionContext`, since the chat switch arrives asynchronously —
  owning it where the agent id is statically known removes both problems.
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
- **No behavioral change on the wire.** The per-agent split is preserved:
  the ticketing agent sends the full descriptor, the dashboard agent only the
  catalog id — expressed as `catalogIdOnly: true` on the dashboard's
  `initAgentStore` call instead of a hand-built context entry in the store.
  `provideA2uiCatalog(customCatalog)` keeps its default
  (`sendCatalogDescription: true`), so the custom-component prompt section is
  expanded exactly as before.

  A first cut of this step switched the app to
  `sendCatalogDescription: false` and dropped the per-agent split, which
  silently disabled the whole custom-catalog demo (with `components: {}` the
  server emits no component section, so the model can never reference
  `TicketWidget`). Reverted — if the book or slides quote that state, ignore
  it.

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
- **The hotels MCP Apps widget did not render — root cause was our own
  prompt.** The `USE_MCP` branch of
  [ticketing-agent.prompt.ts](../ai-server/src/mastra/agents/ticketing-agent.prompt.ts)
  said to emit the intro `messageWidget` _"together with the
  hotels_findHotels call"_ — contradicting the prompt's own general rule
  ("FIRST call any DATA tools you need and wait for their results"). The
  model followed it and put both calls in one batch. Mastra hands control
  back to the client as soon as a batch contains a client tool, so
  `hotels_findHotels` was never executed: no result, no
  `mcp-apps` snapshot, no widget — and the model wrote "Hier sind Hotels in
  Graz" without ever having the data. Fix: the hotels section now states that
  `hotels_findHotels` is a data tool, must be called alone, and that the
  `messageWidget` follows only after its result. Measured against the live
  server with the app's realistic 17-tool payload: **0/6 runs rendered the
  widget before the fix, 8/8 after.**

  Two notes for the book/slides: the prompt file is untouched by the 0.3.0
  migration, so this bug predates it; and the underlying Mastra behavior
  (server-side calls in a mixed batch are dropped silently) is worth a
  mention as an agent-design pitfall — data tools first, terminal widgets
  last, never in one batch. An attempt to compensate for it in
  `ExtendedMastraAgent` by re-executing dropped calls was reverted as a hack.

- **Unfinished server tool calls were only half-reported.**
  `ExtendedMastraAgent` tracked a single `activeToolCallId`, so when several
  tool calls were open at run end only the last one produced the fallback
  error result — and if that last one was a client widget call, nothing was
  reported at all, which is why the failure above was invisible on the wire.
  Pending server-side calls are now tracked as a set and all of them get the
  fallback result. Same message as before, no new behavior.

## A2UI surface lifecycle (2026-07-29)

- **Surfaces are now built once and owned by the component that built them.**
  [a2ui-activity-renderer.ts](../src/app/domains/shared/util-copilotkit/a2ui/a2ui-activity-renderer.ts)
  ran `renderer.processMessages(content().operations)` in a plain effect, so
  every re-delivery of the same activity message replayed its operations —
  CopilotKit re-clones activity messages, and the A2UI processor rejects a
  second `createSurface` for a known id (`ErrorHandler` noise, no visible
  update). The renderer now remembers the surface id it built, skips
  re-processing while that id is unchanged, and deletes the surface
  (`surfaceGroup.deleteSurface`) both on `DestroyRef` teardown and before
  switching to a different id. An activity message describes exactly one
  surface, which is what makes build-once correct.
- **Consequence:** the same surface id can be rendered again after its
  component was destroyed, so the global sweep in
  [dashboard.ts](../src/app/shell/dashboard/dashboard.ts)
  (`clearRenderedSurfaces()` walking `surfaceGroup.surfacesMap` on every send
  and reset) is deleted, together with its `A2uiRendererService` injection.
  Point for the book/slides: surface lifetime belongs to the renderer
  component, not to the screen that happens to host a chat.
- **Specs.** `a2ui-activity-renderer.spec.ts` gained a destroy/re-render
  roundtrip (render `surf-1` → unmount → surface gone → render `surf-1`
  again, no errors) and its basic-catalog id was corrected to
  `…/v0_9/catalogs/basic/catalog.json`. New
  [copilot-activity.spec.ts](../src/app/domains/shared/util-copilotkit/activity/copilot-activity.spec.ts)
  covers the same behavior one level up, through the real activity pipeline:
  a re-cloned message, a later snapshot for an already-built surface, and a
  switch to a different surface.
- **Refactor, no behavior change:** the body of `CopilotActivity.rendered`
  moved into the pure `toRenderActivity(message, configs, agent)` at the end
  of
  [copilot-activity.ts](../src/app/domains/shared/util-copilotkit/activity/copilot-activity.ts);
  the computed only reads the three signals and delegates.
