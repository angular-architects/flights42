# CopilotKit Angular: migration opportunities (docs.copilotkit.ai/angular, `@copilotkit/angular@0.3.0`)

CopilotKit has published a rewritten Angular documentation set at
<https://docs.copilotkit.ai/angular> and released `@copilotkit/angular@0.3.0`
(built on `@copilotkit/core@1.63.2`). We are on `0.2.0` (core `1.63.1`). This
report compares the new documented feature set against our current integration
and lists what we could do differently or better. No code has been changed.

Related project docs: [copilot-eval.md](copilot-eval.md) (original evaluation),
[migration.md](migration.md) (Option 2 decision: keep the flights shell),
[bridge.md](bridge.md) (workflow step bridge).

## TL;DR

| Area              | New in docs/0.3.0                                                      | Our status                                                                          | Recommendation                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interrupts        | `injectInterrupt` signal controller                                    | Hand-written `pendingInterrupts` handling                                           | **Adopt** — removes two workarounds                                                                                                                                                                            |
| HITL tools        | `registerHumanInTheLoop` + renderer contract                           | Plumbing exists, unused                                                             | Keep unused; our approvals are backend checkpoints                                                                                                                                                             |
| MCP Apps          | Built-in: `provideMCPApps()` + `@ag-ui/mcp-apps-middleware`            | Fully custom iframe host                                                            | **Adopt** — middleware is runtime-independent; see [Discussions D1](#d1-mcp-apps-same-lineage-different-transport--verified)                                                                                   |
| A2UI              | First-class `a2ui: { catalog, recovery }` in `provideCopilotKit`       | Legacy `@a2ui/angular/v0_9` + custom catalog plumbing                               | Partial adoption possible; gated by zod v3/v4 and our server path                                                                                                                                              |
| Agent context     | `connectAgentContext` / `CopilotKitAgentContext`                       | Custom `AppHttpAgent.requestInit()` merging                                         | **Adopt partially** — slims a wrapper                                                                                                                                                                          |
| Shared state      | `injectAgentStore`: `store().state()` reads, `agent.setState()` writes | Since the `copilotkit-state` merge: reads native, writes via custom `state` factory | Reads done; consider `setState()` for writes — see [Discussions D8](#d8-shared-state-after-the-copilotkit-state-merge)                                                                                         |
| Threads/memory    | `injectThreads`, `injectMemories`, `CopilotThreadsDrawer`              | Custom `useServerMemory` de-dup hack                                                | Only reachable via Copilot Runtime; part of the same decision                                                                                                                                                  |
| Attachments       | `AttachmentsConfig`, multimodal input                                  | Custom multimodal re-injection on the server                                        | Interesting for the check-in (OCR) flow                                                                                                                                                                        |
| Chat UI           | Richer slots, `CopilotChatView`, label providers                       | Custom shell (deliberate)                                                           | Optional; revisit only if shell maintenance hurts                                                                                                                                                              |
| Activity messages | `registerRenderActivityMessage` now documented API                     | We use it, plus a re-implemented dispatcher                                         | Verified: 0.3.0 has **no** standalone dispatch component — keep `CopilotActivity`, but rewire it to `activityMessageRenderConfigs()` and pass the new `agent` input (D1.4); deletable only once PR #6033 lands |

The strategic fork in the road is **whether to put Copilot Runtime in front of
our Mastra agents**. Built-in MCP Apps, threads, memories, and attachments all
assume runtime mediation. Our `ExtendedMastraAgent` already implements the
AG-UI `AbstractAgent` interface the runtime consumes, so the technical distance
is smaller than it was when [migration.md](migration.md) was written.

## 1. Where we stand today

Summary of the current posture (details in the referenced files):

- **Headless CopilotKit.** `provideCopilotKit` only carries
  `renderActivityMessages` ([app.config.ts](../src/app/app.config.ts)); agents
  are registered imperatively as `selfManagedAgents` via our `initAgentStore()`
  ([init-agent-store.ts](../src/app/domains/shared/util-copilotkit/init-agent-store.ts)).
- **Raw AG-UI transport.** `AppHttpAgent` (an `HttpAgent` subclass) POSTs to
  Mastra's `/ag-ui/:agentId` SSE routes. No Copilot Runtime endpoint exists;
  `@copilotkit/runtime@1.63.1` is installed but never imported.
- **Custom chat shell.** The only stock UI component in the main app is
  `<copilot-render-tool-calls>`; everything else (panel, composer, autoscroll,
  interrupt bubbles, activity dispatch) is application code.
- **Custom interrupt protocol.** Mastra `suspend()` → AG-UI
  `RUN_FINISHED { outcome: { type: 'interrupt', interrupts: [...] } }` →
  `agent.pendingInterrupts` → `resumeInterrupt()` with `buildResumeArray`.
- **Custom MCP Apps host.** Server stamps `ACTIVITY_SNAPSHOT` events with
  `activityType: 'mcp-apps'`; the client runs its own browser-side MCP `Client`,
  `AppBridge`, and sandboxed iframe
  ([mcp-apps-widget.ts](../src/app/domains/shared/util-copilotkit/mcp-apps/mcp-apps-widget.ts)).
- **Legacy A2UI.** `@a2ui/angular/v0_9` renderer plus a hand-rolled catalog
  (`provide-a2ui-catalog.ts`) serialized into an AG-UI context entry and
  expanded into the system prompt server-side.
- **Shared state (since the `copilotkit-state` merge).** The travel-refinement
  plan lives in a client `TravelPlanStore`, travels to the server as
  `RunAgentInput.state` (via a `state` factory on `AppHttpAgent`), is mutated
  by server-side Mastra plan tools through the AG-UI bridge, and streams back
  as `STATE_SNAPSHOT` into `store().state()`. See
  [Discussions D8](#d8-shared-state-after-the-copilotkit-state-merge) and
  [bridge.md](bridge.md).

## 2. Interrupts and human-in-the-loop

### What the new docs offer

The [human-in-the-loop guide](https://docs.copilotkit.ai/angular/guides/human-in-the-loop)
now separates two patterns:

1. **`registerHumanInTheLoop`** — agent-driven approvals. A component
   implements `HumanInTheLoopToolRenderer<Args>`, receives a
   `HumanInTheLoopToolCall` input, and calls `call.respond({...})`. CopilotKit
   supplies the handler, waits for `respond`, and resumes the run.
2. **`injectInterrupt<T>({ agentId })`** — workflow-driven checkpoints. A
   headless, signal-based controller:
   - `event()` — signal with the pending decision payload
   - `resolve(choice)` / `cancel()` — resume or abort
   - `error()` — signal for submission failures
   - clears stale decisions on thread change, guards against double submission
   - supports `enabled` (filter which payloads a component accepts) and
     `handler` (async data preparation before rendering)

### What this replaces for us

`injectInterrupt` is a direct match for our backend-driven flow
(`book-flight.ts` / `cancel-flight.ts` suspend → approval options → resume) and
would supersede two documented workarounds:

- the **signal-priming hack** in
  [agent-store-helper.ts:22-26](../src/app/domains/shared/util-copilotkit/agent-store-helper.ts#L22-L26),
  where `isRunning()` and `messages()` are read solely to force recomputation
  because `agent.pendingInterrupts` is a plain property;
- the hand-written **resume mapping and optimistic hiding** in
  [chat-messages.ts:135-162](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts#L135-L162)
  and `assistant-chat.ts` (`resolvedInterruptId` signal, `buildResumeArray`
  plumbing). The controller's built-in double-submit guard and stale-decision
  clearing cover exactly the edge cases we solved by hand.

Because the controller is headless, it fits our custom shell without adopting
any stock chat component. It is also `agentId`-scoped, which matches our
six-store setup.

### What to verify before adopting

- **Payload shape.** Our server puts everything bridge-specific into
  `interrupt.metadata` (`kind`, `toolName`, `suspendPayload` with `message` and
  `options`) and the protocol-level `responseSchema`
  ([extended-mastra-agent.ts:831-867](../libs/ag-ui-server/extended-mastra-agent.ts#L831-L867)).
  Confirm `injectInterrupt`'s `event()` exposes the full interrupt object
  (including `metadata`) and that `resolve(...)` produces the
  `{ interruptId, payload }` resume entries our
  [resume handler](../libs/ag-ui-server/extended-mastra-agent.ts#L1162-L1213)
  expects — i.e. that it speaks the same AG-UI resume array we currently build
  with `buildResumeArray`.
- **Single-interrupt assumption.** Our server honors only the first resume
  entry; check the controller does not batch multiple resolutions.
- **`forwardedProps` on resume.** `resumeInterrupt()` currently forwards
  props (agent mode); confirm the controller offers an equivalent, or keep a
  thin wrapper for that one concern.

### `registerHumanInTheLoop`

Not a replacement for the above: it covers _client-side_ approval tools where
the model decides to ask. Our approvals are deliberate _backend_ checkpoints
(`USE_APPROVAL` in [feature-flags.ts](../libs/feature-flags/feature-flags.ts)),
which is the right model for booking/cancelling. Keep the empty
`humanInTheLoop` plumbing in `initAgentStore` for future client-side approvals,
but no migration is needed here.

## 3. MCP Apps

### What the new docs offer

CopilotKit now ships [full MCP Apps support](https://docs.copilotkit.ai/whats-new/mcp-apps-support):

- **Runtime side:** `new CopilotRuntime({ agents, mcpApps: { servers: [{ type: 'http', url, serverId }] } })`,
  or scoped per agent via an `MCPAppsMiddleware` attached with `.use()` on the
  agent instance. HTTP and SSE transports are supported. A stable `serverId` is
  required in production so stored apps in history keep loading when URLs
  change.
- **Frontend side (Angular):** `provideMCPApps()` from the
  `@copilotkit/angular/mcp-apps` entry point. When the agent calls an MCP tool
  that has an associated UI resource, CopilotKit fetches and renders it in a
  sandboxed iframe automatically — no frontend renderer code. Communication
  between the rendered UI and the MCP server is **proxied through the
  runtime**.

### How this compares to our implementation

We already do all of this ourselves, and our host is feature-complete
(theming, `sizechange` auto-height, display-mode requests, link handling,
`callServerTool` refresh). Two architectural differences matter:

1. **Proxying.** In our setup the _browser_ connects directly to the MCP
   server (`http://127.0.0.1:3002/mcp`), which forced CORS and
   private-network-access headers on the MCP server and exposes it to every
   client. CopilotKit's model proxies MCP traffic through the runtime — a
   materially better production posture (auth, no public MCP endpoint, no
   CORS surface).
2. **Coupling.** Our path needs the server-side `ACTIVITY_SNAPSHOT` hook plus
   `_meta.ui` sniffing on `@mastra/mcp` tools
   ([extended-mastra-agent.ts:1045-1088](../libs/ag-ui-server/extended-mastra-agent.ts#L1045-L1088)),
   the custom activity renderer, and the widget host. The official path would
   delete essentially all of it — client _and_ server.

### The catch: Copilot Runtime

> **Superseded.** Verification against the shipped packages showed the server
> side of MCP Apps is `@ag-ui/mcp-apps-middleware` — a standalone AG-UI
> middleware that does **not** require Copilot Runtime. See
> [Discussions D1 and D3](#discussions), which replace the rest of this
> subsection.

`mcpApps` is a `CopilotRuntime` feature. We rejected the runtime endpoint when
this integration was built (see [ag-ui-server-options in memory /
migration.md](migration.md)) because CopilotKit v1's `registerCopilotKit` was
GraphQL-based. That reasoning is stale: the v2 runtime speaks raw AG-UI and
accepts _"a map of AG-UI `AbstractAgent` instances"_ — which is exactly what
`ExtendedMastraAgent` is. A plausible integration:

```
Angular (runtimeUrl) ──► CopilotRuntime (Node, thin)
                            agents: { ticketingAgent: extendedMastraAgent, ... }
                            mcpApps: { servers: [{ type: 'http', url: MCP_URL, serverId: 'hotels' }] }
```

Open questions to prototype before committing:

- Can `CopilotRuntime` host our `ExtendedMastraAgent` unchanged, or does it
  re-instantiate agents per request in a way that breaks our per-run state
  (step bridge, thought-signature cache)?
- Do our custom AG-UI extensions (`ACTIVITY_SNAPSHOT` for `a2ui-surface`,
  synthetic `STEP_*` events, `outcome.interrupts`) pass through the runtime's
  event pipeline untouched?
- Does `MCPAppsMiddleware` work when attached directly to an `AbstractAgent`
  used as a self-managed agent (no runtime)? The docs only show it in runtime
  context, but if it works client-independent, we might get official MCP Apps
  _without_ adopting the runtime. Worth a spike.
- Whether the hotels MCP tools would then be registered at the runtime level
  rather than via `@mastra/mcp`'s `MCPClient.listTools()` inside the agent —
  and what that means for the `USE_MCP` toggle and the prompt branch in
  `ticketing-agent.prompt.ts`.

### Small independent fix

Our own provider is called `provideMcpApps`
([mcp-apps.provider.ts](../src/app/domains/shared/util-copilotkit/mcp-apps/mcp-apps.provider.ts));
CopilotKit's is `provideMCPApps`. If we ever import both, the near-identical
names will confuse. Renaming ours (e.g. `provideFlightsMcpAppsHost`) is cheap
insurance and signals which one is application code.

## 4. A2UI

### What the new docs offer

The [A2UI guide](https://docs.copilotkit.ai/angular/guides/a2ui) makes A2UI a
first-class config on the provider:

```ts
provideCopilotKit({
  runtimeUrl: '/api/copilotkit',
  a2ui: {
    catalog: productCatalog,
    recovery: { showAfterMs: 2_000, showAfterAttempts: 2 },
  },
});
```

- Catalogs are Zod-validated component definitions.
- **`includeSchema`** (default on) puts the catalog schema into agent context
  automatically — the exact job of our hand-rolled
  [catalog-context.ts](../src/app/domains/shared/util-copilotkit/a2ui/catalog-context.ts)
  and the server-side prompt expansion in
  [add-custom-catalog-instructions.ts](../libs/ag-ui-server/add-custom-catalog-instructions.ts).
- Styling via stable semantic classes (`a2ui-card`, `a2ui-status-success`, …)
  instead of model-generated colors.
- **Stream recovery** thresholds for interrupted/garbled surface streams —
  something we currently have no answer for at all.

### Fit and blockers

We deliberately stayed on `@a2ui/angular/v0_9` and built our own catalog base
because of a zod-v3-vs-bundled-zod mismatch in a2ui's `CatalogComponent` /
`DynamicComponent`. That situation needs re-checking, not assuming:

- `@copilotkit/angular@0.3.0` depends on `zod@^3.25.75`; the project is on
  `zod@^4.3.5`. Our `registerFrontendTool` schemas already cross that boundary
  today, so it may be a non-issue for the catalog too — verify with the actual
  `a2ui` catalog config.
- Our surfaces do not come from the LLM streaming A2UI into the chat; they
  arrive as **tool results** validated server-side
  ([render-a2ui-tool.ts](../libs/ag-ui-server/render-a2ui-tool.ts)) and shipped
  as `ACTIVITY_SNAPSHOT { activityType: 'a2ui-surface' }`, and the dashboard
  compiles its DSL server-side and injects synthetic events without any LLM
  round-trip ([dashboard-ag-ui-route.ts](../ai-server/src/mastra/routes/dashboard-ag-ui-route.ts)).
  CopilotKit's `a2ui` config presumably expects its own transport for
  surfaces. Whether the new renderer can be fed from our activity snapshots is
  the key technical question.
- Our action bridge (`registerHandlers`, `submit-answer-action.ts` turning
  button presses into developer messages) has no obvious counterpart in the
  documented API; it would have to survive any migration.

Realistic takeaways, in ascending ambition:

1. **Adopt the styling convention** (semantic `a2ui-*` classes) — no code
   dependency, aligns us with the ecosystem.
2. **Steal the recovery UX idea** (show a retry affordance after N ms /
   attempts) for our own renderer even if we keep it.
3. **Prototype the CopilotKit catalog + renderer** on one surface (e.g. the
   ticket widget) to test the zod question and the snapshot-feeding question.
   Only then decide about replacing `@a2ui/angular/v0_9`.
4. If (3) works, drop `catalog-context.ts` + the server prompt expansion in
   favor of `includeSchema` (keeping our `sendCatalogDescription` privacy
   switch in mind — `includeSchema: false` covers that case).

## 5. Agent context

The docs promote `connectAgentContext(() => ({ description, value }))` and the
`[copilotkitAgentContext]` template directive for application-owned, read-only
facts, with reactive re-evaluation and automatic cleanup on destroy.

Today this job is done inside `AppHttpAgent.requestInit()`
([app-http-agent.ts](../src/app/domains/shared/util-copilotkit/app-http-agent.ts)),
which merges persistent `Context[]` entries deduped by description. Moving the
catalog context and account-style facts to `connectAgentContext` would shrink
the custom agent subclass to its two irreplaceable jobs: persistent
`forwardedProps` and the server-memory history filter.

To verify: whether `connectAgentContext` can be scoped per agent (ticketing
sends the full catalog, dashboard only the catalog id) — the documented API
shows no `agentId` parameter, so scoping may need the directive placed in
feature components, which incidentally is the more Angular-idiomatic shape
anyway.

The docs' state-vs-context principle — _"shared state for data the agent may
change, context for application-owned facts"_ — matches what we already do; no
change needed conceptually. Since the `copilotkit-state` merge we also _use_
the shared-state half of that principle in production code — assessment in
[Discussions D8](#d8-shared-state-after-the-copilotkit-state-merge).

## 6. Threads, memory, attachments

New documented APIs: `injectThreads` (server-authoritative thread lists,
realtime updates, `startNewThread`/`renameThread`/`deleteThread`),
`CopilotThreadsDrawer`, `injectMemories` (user-scoped memory records), and
`AttachmentsConfig` (file uploads, base64 by default, `onUpload` for external
storage).

All of these assume the Copilot Runtime / AgentRunner persistence layer, so
they are part of the same decision as MCP Apps (§3). If the runtime is
adopted:

- `injectThreads` + `threadId` on the store could replace our
  `useServerMemory` hack — the sent-message-id filtering in
  `AppHttpAgent` exists precisely because we have no thread-aware transport.
- `AttachmentsConfig` is a natural fit for the **check-in flow**, which today
  needs the server-side multimodal re-injection workaround
  ([extended-mastra-agent.ts:399-506](../libs/ag-ui-server/extended-mastra-agent.ts#L399-L506))
  because `@ag-ui/mastra@1.0.0` strips non-text parts. Even without the
  runtime, re-test whether newer `@ag-ui/mastra` releases fixed that, since it
  would let us delete the workaround independently.

## 7. Chat UI and smaller findings

- **`CopilotChatView`** is now positioned exactly for our case: "custom agent
  wiring with chat layout only", with slots for composer, reasoning messages,
  scroll view, and disclaimer. It could absorb our hand-rolled autoscroll and
  composer while keeping the flights look via the stable CSS classes. This
  contradicts nothing in [migration.md](migration.md) (the shell stays ours);
  it is purely a maintenance trade-off and can be revisited any time.
- **Activity rendering is now official API.** `registerRenderActivityMessage`
  appears in the [Angular reference](https://docs.copilotkit.ai/reference/angular).
  Check whether 0.3.0 also exports a standalone activity-rendering component;
  if so, our `CopilotActivity` re-implementation of the internal
  `pickActivityRenderer` dispatch
  ([copilot-activity.ts](../src/app/domains/shared/util-copilotkit/activity/copilot-activity.ts))
  can be deleted. If not, this stays — but re-check on every upgrade, since we
  are duplicating internal fallback-order logic (`agentId` → generic → `'*'`).
- **Suggestions** (`suggestionsConfig`, suggestion views) remain unused. A
  cheap UX win for the dashboard ("Search flights to …") if ever wanted;
  nothing blocks it.
- **Open Generative UI** (sandboxed generated HTML/JS with allow-listed
  `sandboxFunctions`) is a new primitive we do not need — A2UI's typed catalog
  was chosen deliberately for brand/control, and the docs' own guidance agrees
  with that trade-off.
- **Dead dependency:** `@copilotkit/runtime@^1.63.1` is declared in
  [package.json](../package.json) but never imported. Either it becomes real
  (§3) or it should be removed.
- **Zoneless:** the docs confirm first-class support for zoneless Angular
  20–22, so nothing on the CopilotKit side blocks our Angular posture.

## 8. Suggested order of attack

**Execution decision:** the migration runs in **one session, in one go**, in
the order below. Step 5 is descoped (see its note); audio/voice is out of
scope entirely (D9).

**Execution protocol:**

- Each step is a gate: build + lint + existing tests green, then start the
  app and exercise the affected flow before moving to the next step.
- Commit the working state **before step 4** — the MCP Apps spike changes the
  tool-execution model for hotels and must be trivially revertible. If the
  spike fails, revert cleanly and record the findings here instead.
- Do **not** touch: the three test-strategy spec variants (workshop
  material, D8.5), the legacy A2UI stack (D2), the custom chat shell
  ([migration.md](migration.md) Option 2), anything audio/voice (D9).
- Do not raise the `@ag-ui/mastra` pin (peer-dependency on
  `@copilotkit/runtime`, D7).
- Interrupt migration (step 2): resolve the two D5 checks first — duplicate
  tool results (`decision.toolResults` vs Mastra's `approveToolCall` /
  `resumeStream`) and forwardedProps-on-resume (covered by `AppHttpAgent`;
  keep it).
- At the end, append a section `## Migration log` to this document:
  what changed per step, what was deleted, open points, spike verdict.

1. **Upgrade `@copilotkit/angular` 0.2.0 → 0.3.0** (core 1.63.1 → 1.63.2) and
   re-run the app; the release is a minor bump but our `CopilotActivity`
   duplicates internal logic, so verify activity dispatch after upgrading.
   In the same step, enable `defaultToolRendering: true` and delete
   `fallback-tool-card.ts` plus the `'*'` auto-registration in
   `initAgentStore` (decided — see D9; fix the `injectWidgetToolNames()`
   discriminator first). Also rewire `CopilotActivity` per D1.4: consume
   `copilotKit.activityMessageRenderConfigs()` instead of reading config
   sources itself (that computed already merges the built-in token used by
   `provideMCPApps`), keep only pick + `safeParse` + component creation, and
   pass the new `agent` input to instantiated renderers — the shipped MCP
   Apps renderer requires it. Verified: 0.3.0 exports no standalone activity
   dispatch component, so `CopilotActivity` itself stays until PR #6033
   lands.
2. **Migrate interrupts to `injectInterrupt`** (§2) — highest
   confidence, deletes two workarounds, no architectural prerequisites.
3. **Move read-only context to `connectAgentContext`** (§5) — slims
   `AppHttpAgent`.
4. **Spike: `@ag-ui/mcp-apps-middleware` around `ExtendedMastraAgent`** — the
   runtime-free path to official MCP Apps, verified viable in
   [Discussions D1](#discussions). Copilot Runtime itself is not recommended
   ([Discussions D3](#discussions)).
5. **Prototype CopilotKit A2UI catalog — DESCOPED.** D2 settled this:
   CopilotKit's catalogs are Lit-only (`Catalog<LitComponentImplementation>`),
   so Angular custom catalogs cannot move. Keep `@a2ui/angular/v0_9`;
   revisit only if PRs #6072/#6073 (or an equivalent) land upstream. What
   remains from §4: optionally adopt the semantic `a2ui-*` class naming and
   the recovery UX idea in our own renderer.
6. Housekeeping: rename our `provideMcpApps`, remove or activate
   `@copilotkit/runtime`, adopt `a2ui-*` styling classes, re-test
   `@ag-ui/mastra` multimodal stripping.

# Discussions

Findings below were verified against the actual shipped packages
(`@copilotkit/angular@0.3.0` FESM bundles and typings, unpacked from npm;
`@ag-ui/mcp-apps-middleware@0.0.3` and `@copilotkit/runtime@1.63.1` in our
`node_modules`) and against the open PRs in CopilotKit/CopilotKit — not
against the docs alone.

## D1. MCP Apps: same lineage, different transport — verified

**Claim checked:** "Their MCP Apps solution should be close to ours, because it
is my PR."

**Confirmed at code level.** The shipped `@copilotkit/angular/mcp-apps` entry
point has the same public surface as PR
[#6074](https://github.com/CopilotKit/CopilotKit/pull/6074) (_feat(angular):
MCP Apps activity renderer_, still **open**): `CopilotMCPAppsActivityRenderer`,
`mcpAppsActivityRendererConfig`, `CopilotMCPAppsWidget`, `provideMCPApps()`,
rendering from `activityType: "mcp-apps"` activity snapshots whose content is
`{ resourceUri, result: CallToolResult, toolInput?, serverId? }` — the exact
architecture of our
[mcp-apps folder](../src/app/domains/shared/util-copilotkit/mcp-apps/).

The shipped implementation swaps one layer, though — the transport:

| Aspect                 | PR #6074 / our repo                                                                    | Shipped 0.3.0                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP connection         | Browser-side MCP `Client` + `StreamableHTTPClientTransport` directly to the MCP server | None in the browser; every `resources/read` / `tools/call` goes through the AG-UI agent as `runAgent({ forwardedProps: { __proxiedMCPRequest: { serverHash, serverId?, method, params } } })` |
| Server URLs in browser | `provideMCPApps({ servers: {...} })`                                                   | Deliberately refused — the provider doc comment says _"Server URLs deliberately are not accepted by this browser provider"_                                                                   |
| Bridge                 | `@modelcontextprotocol/ext-apps` `AppBridge` + `PostMessageTransport`                  | Hand-rolled JSON-RPC over `postMessage` (`ui/initialize`, `ui/notifications/tool-input`/`tool-result`/`size-changed`, `ui/message`, `ui/open-link`, `tools/call`), no ext-apps dependency     |
| Sandbox                | Single iframe, `allow-scripts allow-forms`                                             | Double iframe: an outer proxy document with a CSP `<meta>` (extended by `_meta.ui.csp.resourceDomains`) hosting an inner `allow-scripts allow-same-origin allow-forms` iframe                 |
| Snapshot schema        | `serverId` required                                                                    | `serverHash` required (MD5 of the server config), `serverId` optional                                                                                                                         |
| Extras                 | Theme/style-variable push, display-mode handling                                       | Per-thread FIFO request queue with agent-idle waiting, renderer-owned cancellation, thread-change dropping; `ui/message` can add a chat message and trigger a follow-up run                   |

The server counterpart is **`@ag-ui/mcp-apps-middleware@0.0.3`** — and this is
the decisive finding: it is a plain AG-UI `Middleware` from `@ag-ui/client`
(peer `>= 0.0.40`; we ship `0.0.57`), **not** a Copilot Runtime feature. It
connects to the configured MCP servers, discovers UI-enabled tools
(SEP-1865 `uiResourceUri`), injects them into `input.tools` as client tools,
intercepts `__proxiedMCPRequest` runs without invoking the LLM, executes
pending UI tool calls at run end while holding back `RUN_FINISHED`, and emits
the `mcp-apps` `ACTIVITY_SNAPSHOT` itself.

**Consequence for us:** we can adopt the official frontend
(`provideMCPApps()`) by wrapping `ExtendedMastraAgent` with this middleware in
our Hono route — no Copilot Runtime involved. That would delete:

- the entire client host: `mcp-apps-widget.ts`, `mcp-apps-activity-renderer.ts`,
  `mcp-apps.provider.ts`, `mcp-apps-content.ts`;
- the server-side `_meta.ui` sniffing and snapshot hook in
  [extended-mastra-agent.ts:657-674, 1045-1088](../libs/ag-ui-server/extended-mastra-agent.ts#L1045-L1088);
- the CORS / private-network-access headers on the MCP server (the browser no
  longer connects to it).

Points to validate in a spike:

1. **Tool ownership moves.** Today `@mastra/mcp`'s `MCPClient.listTools()`
   registers `hotels_findHotels` as a Mastra-side tool; the middleware instead
   injects UI tools as AG-UI _client_ tools and executes them itself after the
   run. The `USE_MCP` branch must stop spreading the Mastra MCP tools (double
   registration otherwise), and the prompt's tool name in
   `ticketing-agent.prompt.ts` must match whatever name the middleware
   announces.
2. **No same-run follow-up.** The middleware executes the tool call after the
   LLM's turn ends — which matches our widget semantics (`followUp: false`),
   but differs from Mastra executing mid-run. Confirm the conversational flow
   still reads well.
3. **Theming.** Our host pushes theme + `--color-ring-primary` into the app;
   the shipped widget announces a static `hostContext` from `provideMCPApps`
   config. No dynamic theme updates — check whether that is acceptable.
4. **The built-in renderer trap — with a ready-made fix.** `provideMCPApps()`
   registers its renderer via the `ɵCOPILOTKIT_BUILT_IN_ACTIVITY_RENDERERS`
   multi-token. Our custom
   [CopilotActivity](../src/app/domains/shared/util-copilotkit/activity/copilot-activity.ts)
   dispatch only consults the `renderActivityMessages` config — renderers
   registered the official way would never render in our shell. The 0.3.0 fix
   is simple: the `CopilotKit` service now exposes
   `activityMessageRenderConfigs()` as a public computed that already merges
   config renderers, `registerRenderActivityMessage` additions, and the
   built-in token. `CopilotActivity` should consume that signal instead of
   reading the config itself, keeping only pick (activityType match,
   agentId-specific → generic → `'*'`) + `safeParse` + component creation.
   One addition: 0.3.0 renderers receive an `agent` input (the shipped MCP
   Apps renderer _requires_ it for proxied requests) — `CopilotActivity` must
   pass it.

## D2. A2UI: Lit-only catalogs — confirmed

**Claim checked:** "They still use the Lit version, so custom catalogs with
Angular components are not possible."

**Confirmed.** `@copilotkit/a2ui-renderer@1.63.2` depends on
`@a2ui/web_core@0.9.0`, `lit@^3.3.2`, `zod@^3.25.75` (plus React 18/19 peer
dependencies). The Angular package renders surfaces through the
`<cpk-a2ui-surface>` custom element and assigns the catalog as a property. The
typings are unambiguous:

```ts
interface A2UIConfig {
  theme?: Theme;
  catalog?: Catalog<LitComponentImplementation>;
  loadingComponent?: () => LitRenderable;
  includeSchema?: boolean;
  recovery?: A2UIRecoveryOptions;
}
```

Custom catalog components must be **Lit component implementations**; Angular
components (our `TicketWidget`) cannot participate. Wrapping Angular
components via `@angular/elements` would still fight the
`LitComponentImplementation` type and is not worth it.

Two mitigating observations:

- The shipped Angular A2UI path also renders from
  `activityType: "a2ui-surface"` snapshots — the same transport our server
  emits. A later renderer swap would be a frontend-only change; the protocol
  already matches.
- PRs [#6072](https://github.com/CopilotKit/CopilotKit/pull/6072) (A2UI
  activity renderer using the official _Angular_ A2UI renderer) and
  [#6073](https://github.com/CopilotKit/CopilotKit/pull/6073) (typed
  custom-catalog helpers) are exactly the Angular-native alternative — both
  still open. Until they (or an equivalent) land, our legacy
  `@a2ui/angular/v0_9` stack remains the **only** way to have Angular
  components in catalogs, and keeping it is the right call.

Interim: steal the ideas that don't require the renderer — the semantic
`a2ui-*` styling classes and the recovery UX (`showAfterMs` /
`showAfterAttempts`) — for our own renderer.

## D3. Copilot Runtime on the server: assessment

**Question:** is adopting Copilot Runtime sensible, given the repo should
demonstrate the concepts independent of the server stack?

**Recommendation: no — and after D1, there is no remaining need.**

- **The didactic argument is decisive.** The repo's story is: any agent
  backend (today Mastra, tomorrow anything) speaks AG-UI over SSE, and the
  client consumes the protocol. Putting Copilot Runtime in front replaces
  "your server stack" with CopilotKit's Node runtime — the story degrades from
  "an open protocol between two independent parties" to "CopilotKit
  end-to-end". For a training codebase that is a real loss, not a nuance.
- **The main motivation is gone.** The only hard feature that seemed
  runtime-bound was MCP Apps; D1 shows `@ag-ui/mcp-apps-middleware` works
  against any `AbstractAgent`. Interrupts (`injectInterrupt`) are client-side
  only. Both big offloads happen without the runtime.
- **What stays runtime-exclusive** — `/info` agent discovery, `injectThreads`
  / `injectMemories` persistence (AgentRunner), attachment upload plumbing,
  model router, enterprise features — is nothing the training story needs.
  Server memory demonstrated with Mastra's own memory (our `useServerMemory`
  path) is arguably the _better_ demo of the concept.
- **Dependency hygiene.** `@copilotkit/runtime` drags in
  `@copilotkit/license-verifier`, `@scarf/scarf`, and
  `@segment/analytics-node` — licensing/telemetry machinery with no place in
  a training repo.

Actions: remove the unused `@copilotkit/runtime` from `package.json`; if the
D1 spike succeeds, add `@ag-ui/mcp-apps-middleware` (tiny: rxjs + MCP SDK)
instead. This supersedes §3 "The catch" and step 4 of §8.

## D4. The open PR portfolio is the real migration lever

Six open upstream PRs mirror our infrastructure code almost one-to-one. The
"as little infrastructure code as possible" goal is therefore mostly a
question of upstream merges, not local refactoring:

| PR                                                                                         | Local counterpart                           | Status in shipped 0.3.0                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#6074](https://github.com/CopilotKit/CopilotKit/pull/6074) MCP Apps activity renderer     | `util-copilotkit/mcp-apps/*`                | Shipped in adapted form (agent-proxied transport, D1) — PR needs rebase onto that model or closure; local code becomes deletable either way                                                                                                                                      |
| [#6072](https://github.com/CopilotKit/CopilotKit/pull/6072) Angular A2UI activity renderer | `a2ui-activity-renderer.ts`                 | Not shipped — Lit renderer chosen instead (D2); decide whether to keep pushing                                                                                                                                                                                                   |
| [#6073](https://github.com/CopilotKit/CopilotKit/pull/6073) Typed custom-catalog helpers   | `provide-a2ui-catalog.ts`, `a2ui-schema.ts` | Not shipped; same decision as #6072                                                                                                                                                                                                                                              |
| [#6033](https://github.com/CopilotKit/CopilotKit/pull/6033) Standalone `CopilotActivity`   | `activity/copilot-activity.ts`              | Not shipped (verified in the 0.3.0 bundle: dispatch still lives inside `CopilotChatMessageView`) — local component stays until merge, but shrinks via `activityMessageRenderConfigs()` per D1.4 / §8 step 1                                                                      |
| [#6075](https://github.com/CopilotKit/CopilotKit/pull/6075) `initAgentStore`               | `init-agent-store.ts`                       | Not shipped — keep local                                                                                                                                                                                                                                                         |
| [#6076](https://github.com/CopilotKit/CopilotKit/pull/6076) `ContextHttpAgent`             | `app-http-agent.ts`                         | Not shipped — keep local; also load-bearing for interrupts (D5.2). Note: the PR covers context / forwarded props / server memory but **not** the `state` factory added by the `copilotkit-state` merge — either extend the PR or make the factory obsolete via `setState()` (D8) |

Worth discussing: which of these to rebase onto 0.3.0 first. #6033 and #6076
have the highest local payoff (they delete the two most intricate wrappers and
defuse the D1.4 trap); #6074's fate should be settled with the maintainers
since the shipped variant took its API surface but a different transport.

## D5. Interrupts: protocol compatibility verified, two checks remain

Bundle inspection of `injectInterrupt` / `InterruptController` in 0.3.0
confirms it speaks exactly our protocol: it subscribes to the agent, reads
`agent.pendingInterrupts` (the array our server fills via
`outcome.interrupts`), and resumes through the same core `runAgent`
resume-array path our `buildResumeArray` uses. On top we get for free:
multi-interrupt gating (resume fires only after the complete set is
addressed), thread-change clearing, resume-in-flight de-duplication,
`InterruptExpiredError`, and a legacy LangGraph path
(`forwardedProps.command.resume`) we don't need.

Two things to check in the spike, both visible in the bundle:

1. **Client-side tool messages on resolve.** A standard-interrupt resolution
   may append `role: "tool"` messages from `decision.toolResults` before
   resuming. Our interrupts carry a `toolCallId`, and on our server the tool
   result is produced by Mastra's `approveToolCall` / `resumeStream` — verify
   no duplicate tool results appear for our `approval` / `suspend` kinds.
2. **No `forwardedProps` on resume.** `#startResume` passes only
   `{ resume }`. Our resume currently can forward the agent mode; this is
   harmless _only because_ `AppHttpAgent` injects persistent `forwardedProps`
   into every request — i.e. the interrupt migration silently depends on
   keeping `AppHttpAgent` (or on PR #6076 merging). Note the coupling in the
   migration order.

The interrupt _UI_ stays ours either way: mapping
`metadata.suspendPayload.options` to buttons is application knowledge.
CopilotKit takes over the state machine, not the bubble.

## D6. Further points worth discussing

- **zod boundary, again.** The shipped mcp-apps bundle imports `zod/v4`
  (subpath of zod 3.25+); the project is on zod 4.3.5, where the subpath also
  exists. Types will likely align, but mixed zod _instances_ were the exact
  failure mode of the a2ui catalog episode — test schema validation at
  runtime, not by reading typings.
- **`simple-client` as the integration test bed.** It already uses the stock
  `<copilot-chat>`; upgrade it to 0.3.0 first and exercise `injectInterrupt`
  and `provideMCPApps` there before touching the flights shell.
- **`serverHash` vs `serverId`.** The middleware derives `serverHash` from the
  server config (MD5) and resolves proxied requests by hash _or_ id. Configure
  an explicit `serverId: 'hotels'` so stored conversations keep rendering when
  the URL changes between environments — the docs' production warning applies
  to us because config.json swaps hosts.
- **Naming collision is now acute.** With 0.3.0, `provideMCPApps` (theirs) and
  our `provideMcpApps` would both exist in the codebase during any transition
  period. Rename ours before starting, not after.
- **Upgrade sequencing.** 0.2.0 → 0.3.0 moves the core pin from 1.63.1 to
  1.63.2 and introduces the built-in-renderer token. Do the upgrade as its own
  commit with the D1.4 audit of `CopilotActivity`, before any feature
  migration, so regressions bisect cleanly.

## D7. Would Copilot Runtime remove our custom Mastra code? — No

**Question:** what would the runtime buy us server-side — could it replace the
custom Mastra bridge?

**Answer: mostly no.** The runtime is a hosting layer _around_ AG-UI
`AbstractAgent` instances — the Mastra ⇄ AG-UI translation is exactly the part
it does **not** do. Verified against the packages:

- The runtime has no Mastra adapter of its own (its deps include
  `@ag-ui/langgraph`, but nothing Mastra). Whoever hosts a Mastra agent hands
  the runtime an adapter — ours or the stock one.
- The stock adapter, even at the latest version (`@ag-ui/mastra@1.1.1`; we pin
  `1.0.0`), contains **zero** code for interrupts, suspend/approval, or
  activity snapshots (grep over the published bundle: no
  `interrupt|suspend|approv|ACTIVITY_SNAPSHOT|outcome` hits). Everything
  [extended-mastra-agent.ts](../libs/ag-ui-server/extended-mastra-agent.ts)
  does — interrupt/resume mapping, `approveToolCall`/`declineToolCall`
  routing, snapshot emission, multimodal re-injection, `thoughtSignature`
  caching, tripwire surfacing, the step bridge — would remain application
  code under the runtime, unchanged.

What the runtime _would_ replace, with line counts for honesty:

| Our code                                                          | Lines           | Runtime equivalent                                                                                                                                |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extended-mastra-agent.ts` + `step-bridge.ts`                     | 1,350           | **Nothing** — stays in full                                                                                                                       |
| `ag-ui-route.ts` + `ag-ui-stream.ts` + `sse.ts`                   | 265             | `createCopilotHonoHandler` (a v2 Hono adapter exists, so it could even mount into the Mastra server) — plus `/info` discovery, CORS config, hooks |
| `agentMode` → agent mapping in the route                          | (part of above) | Expressible as an `AgentsFactory` (agents config accepts factories with request context)                                                          |
| `dashboard-ag-ui-route.ts` (DSL compile, synthetic events, cache) | 393             | No equivalent — would need porting into an AG-UI `Middleware`; a port, not a deletion                                                             |

So the runtime would delete ~265 lines of small, stable, already-debugged
transport code (including the solved SSE write-ordering subtlety) and leave
the 1,350-line bridge — the code the question is actually about — untouched,
while adding the dependency and didactic costs from D3.

The real levers for shrinking `extended-mastra-agent.ts` are upstream, and
none of them require the runtime:

1. `@ag-ui/mcp-apps-middleware` takes over the `mcp-apps` snapshot hook (D1).
2. `@ag-ui/a2ui-middleware` (0.0.10, standalone, emits `a2ui-surface`
   `ACTIVITY_SNAPSHOT`s from streamed tool args) might take over parts of the
   A2UI hook — worth a look, same pattern as D1.
3. The interrupt mapping would have to land in the official Mastra adapter to
   ever leave our repo — a candidate for the next upstream PR, alongside the
   existing six (D4).

One caution for that path: `@ag-ui/mastra@1.1.1` now declares a peer
dependency on `@copilotkit/runtime@^1.60.1` (1.0.0 did not) — the official
Mastra adapter is drifting runtime-ward. If we upgrade the pin, check whether
that peer is real coupling or just type imports; it would reintroduce the
runtime package we want to remove (D3), if only as an install-time
requirement.

## D8. Shared state after the `copilotkit-state` merge

The merge implements bidirectional shared state for the travel-refinement
flow, and it lands remarkably close to the documented CopilotKit pattern —
with one custom piece worth discussing.

**What the merge does.** The plan lives client-side in `TravelPlanStore`
(ngrx signals, new `plan` computed). `initAgentStore` and `AppHttpAgent`
gained a `state?: () => unknown` factory that stamps the plan into
`RunAgentInput.state` on every request (pull model — the client is the source
of truth). Server-side, the AG-UI bridge gained `getState` / `setState` /
`emitStateSnapshot`; the seven former _frontend_ plan tools were deleted and
reborn as Mastra tools ([ai-server/src/mastra/tools/plan/](../ai-server/src/mastra/tools/plan/))
that read, mutate, and commit the run's working copy — each commit streams a
`STATE_SNAPSHOT` back. On the client,
[travel-refinement-chat-service.ts](../src/app/domains/ticketing/feature-travel-planner/travel-refinement-chat-service.ts)
mirrors `store().state()` into `TravelPlanStore` via an effect. Internal plan
tools are additionally suppressed on the wire (`hiddenToolNames` in
[extended-mastra-agent.ts](../libs/ag-ui-server/extended-mastra-agent.ts)),
since the snapshot already conveys their outcome. Details in
[bridge.md](bridge.md).

**Assessment against the new docs:**

1. **The read side is already CopilotKit-native.** `store().state()` is
   exactly the API the shared-state guide prescribes; the effect-based mirror
   into the ngrx store is idiomatic. Nothing to migrate.
2. **The write side is the discussion point.** The docs prescribe
   `store().agent.setState()`; `AbstractAgent.setState()` exists in our
   `@ag-ui/client@0.0.57`, and `HttpAgent` includes `this.state` in the run
   input automatically. An effect calling `agent.setState(planStore.plan())`
   would make the custom `state` factory in `AppHttpAgent` /
   `initAgentStore` unnecessary — one less custom option, one step closer to
   the documented API, and a smaller surface for PR #6076 (D4). Trade-off:
   the factory is _pull_ (state is read fresh at request time and can never
   be stale); `setState` is _push_ (an effect must have run before every
   send, and `setState` may notify agent subscribers — verify no unwanted
   side effects before switching). Recommended: try the `setState` variant in
   the spike; keep the factory only if the push model shows real gaps.
3. **`hiddenToolNames` stays application code.** CopilotKit has no wire-level
   tool-call suppression. Client-side, 0.3.0's `defaultToolRendering`
   (unknown tools render _nothing_ unless opted in) would hide these calls
   from the UI — but our `'*'` fallback card deliberately opts into showing
   unknown tools, and wire-level hiding also keeps internals away from every
   client and saves traffic. Keeping it is the right call; it is one more
   item on the "would need upstreaming into the Mastra adapter" list (D7).
4. **Snapshots, not deltas — fine.** AG-UI also defines `STATE_DELTA`
   (JSON Patch; the CopilotKit client applies both). For plan-sized state,
   full snapshots per commit are simpler and correct; revisit only if state
   grows by orders of magnitude.
5. **The new testing infrastructure is workshop material.** The three spec
   variants ([agui-mock](../src/app/domains/ticketing/ai/ticketing-agent-store.agui-mock.spec.ts),
   aimock, mock-agent) deliberately demonstrate _different_ test strategies
   for the workshop — their overlap is didactic, not accidental. Do not
   consolidate them during migration, and leave
   [agui-mock.ts](../src/app/testing/agui-mock.ts) as-is. Secondary
   observation only: the new CopilotKit docs have no testing story, so a
   generic AG-UI mock agent would still make a plausible seventh PR for the
   portfolio (D4) — but teaching is the primary purpose here.

No change to the recommended order of attack (§8): the merge does not touch
interrupts, MCP Apps, or A2UI. Only the §8-step-3 scope grows slightly —
when slimming `AppHttpAgent` via `connectAgentContext`, decide the
state-factory question (point 2 above) in the same step.

## D9. Feature inventory: what the demo does not use

For a workshop repo, unused features are a backlog of potential demos, not
debt. Three categories:

**A. Deliberately unused — documented architecture decisions, keep as is:**

- The stock chat UI: `CopilotChat` (only `simple-client` uses it),
  `CopilotPopup`, `CopilotSidebar`, `CopilotChatView`, template slots,
  `provideCopilotChatLabels`, the stock composer and with it
  `AttachmentsConfig` — Option 2 in [migration.md](migration.md) keeps the
  flights shell.
- Open Generative UI (`openGenerativeUI`, websandbox, `sandboxFunctions`) —
  the typed A2UI catalog was chosen for brand/control reasons.
- CopilotKit's A2UI pipeline (Lit renderer, `a2ui` config, `includeSchema`,
  recovery) — blocked for Angular catalogs (D2).
- `registerHumanInTheLoop` — approvals are deliberate backend checkpoints.

**B. Untapped and runtime-free — workshop-demo candidates:**

- `injectInterrupt` (planned, D5) and `connectAgentContext` (planned, §5),
  `provideMCPApps` + middleware (planned, D1), `agent.setState()` writes (D8).
- **Both HITL patterns side by side.** The docs teach two patterns; the demo
  shows only workflow interrupts. A small `registerHumanInTheLoop` example
  next to the booking checkpoint would demonstrate agent-driven vs
  workflow-driven HITL in one app — strong workshop material.
- **Suggestions.** `suggestionsConfig` in `provideCopilotKit`,
  `CopilotChatSuggestionView`/`...Pill`, `suggestionsByAgent` on the service.
  The Angular bundle shows no runtime endpoint dependency — suggestions run
  through the agent via core, so this likely works with self-managed agents.
  Verify, then it is an easy, visible demo.
- **Reasoning rendering.** CopilotKit renders reasoning as a chat message
  type; AG-UI defines thinking events. Our server never emits them
  (`thoughtSignature` is cached for Google replay, never displayed). Mapping
  Mastra reasoning deltas to AG-UI thinking events would light up a whole
  docs chapter in the demo.
- `CopilotPopup` / `CopilotSidebar` — cheap to show in `simple-client`.
- **`defaultToolRendering: true` — DECIDED: adopt.** Verified in the 0.3.0
  bundle: this registers `CopilotDefaultToolRenderer` — a collapsible tool
  card (name, status, expandable args/result) functionally equivalent to our
  [fallback-tool-card.ts](../src/app/domains/shared/util-copilotkit/fallback-tool-card.ts).
  The resolution order in `RenderToolCalls` (the one stock component we use)
  is: named renderer → client tool → HITL → `'*'` wildcard → built-in
  default. Adopting the flag deletes our fallback card plus the
  register-`'*'`-if-absent logic in `initAgentStore`; prerequisite: give the
  `injectWidgetToolNames()` heuristic (`component !== FallbackToolCard`) a
  new discriminator first. Scheduled into §8 step 1.
- **Voice — DECIDED: out of scope.** No audio/voice work is planned; the
  analysis below stays for reference only. There is no voice demo in the repo today.
  The stock path (`CopilotChatAudioRecorder` + transcribe buttons +
  `transcribeAudio`) is runtime-bound — verified: `transcribeAudio` throws
  without a `runtimeUrl` and POSTs to the runtime's `transcribe` method. The
  architecture-fitting variant instead mirrors the check-in OCR demo: record
  in our own composer, send the audio as an AG-UI multimodal part
  (`AudioInputPart` exists in `@copilotkit/shared`; Gemini consumes audio
  directly) — same pattern, different modality. Requires extending the
  server-side multimodal re-injection (today images only). Alternative: a
  small own `/transcribe` Hono route (Mastra voice providers) feeding the
  composer text.

**C. Runtime/Enterprise-bound — out of scope per D3:**

- `injectThreads` + `CopilotThreadsDrawer`, `injectMemories`, audio
  transcription / voice input, `/info` discovery, `BuiltInAgent` + model
  router, `AgentRunner` persistence, channels, Intelligence Platform
  (realtime thread metadata, `licenseStatus`).

## Sources

- <https://docs.copilotkit.ai/angular> (quickstart, packages, Angular 20–22)
- <https://docs.copilotkit.ai/angular/guides/human-in-the-loop>
- <https://docs.copilotkit.ai/angular/guides/frontend-tools-generative-ui>
- <https://docs.copilotkit.ai/angular/guides/a2ui>
- <https://docs.copilotkit.ai/angular/guides/shared-state>
- <https://docs.copilotkit.ai/angular/guides/threads-memory-attachments-headless>
- <https://docs.copilotkit.ai/angular/guides/chat-ui>
- <https://docs.copilotkit.ai/angular/backend/ag-ui>
- <https://docs.copilotkit.ai/angular/concepts/generative-ui-overview>
- <https://docs.copilotkit.ai/angular/agentic-protocols>
- <https://docs.copilotkit.ai/whats-new/mcp-apps-support> and
  <https://docs.copilotkit.ai/agno/generative-ui/mcp-apps> (runtime `mcpApps` config)
- <https://docs.copilotkit.ai/reference/angular> (API inventory)
- npm registry: `@copilotkit/angular@0.3.0` metadata (peer deps, `./mcp-apps`
  entry point, `zod@^3.25.75`)
- Unpacked npm tarballs (basis for # Discussions): `@copilotkit/angular@0.3.0`
  FESM bundles + typings, `@copilotkit/a2ui-renderer@1.63.2`,
  `@copilotkit/web-components@1.63.2`
- Installed packages: `@ag-ui/mcp-apps-middleware@0.0.3` (typings + bundle),
  `@copilotkit/runtime@1.63.1` dependency list
- Open PRs in CopilotKit/CopilotKit: [#6033](https://github.com/CopilotKit/CopilotKit/pull/6033),
  [#6072](https://github.com/CopilotKit/CopilotKit/pull/6072),
  [#6073](https://github.com/CopilotKit/CopilotKit/pull/6073),
  [#6074](https://github.com/CopilotKit/CopilotKit/pull/6074),
  [#6075](https://github.com/CopilotKit/CopilotKit/pull/6075),
  [#6076](https://github.com/CopilotKit/CopilotKit/pull/6076)

## Migration log

Executed 2026-07-28 on branch `copilotkit-v0.3.0`, §8 in one session, in
order. Every gate ran build (`ng build` for `flights` and `simple-client`,
`tsc --build ai-server/tsconfig.json`), lint, the browser test suite, and the
aimock node suite. Baseline before step 1: all green except one pre-existing
failure in `a2ui-activity-renderer.spec.ts` ("Catalog not found:
…/basic_catalog.json" — the test fetches the a2ui basic catalog from the
network, which this session's sandbox blocks). That failure is identical
before and after every step; no new failures were introduced anywhere.
Because no LLM API key was available in the session, "exercise the affected
flow" was implemented per step with the strongest available substitute (noted
below); the LLM-driven happy paths should be re-checked manually once.

### Step 1 — upgrade 0.2.0 → 0.3.0, `defaultToolRendering`

- `@copilotkit/angular` pinned to `0.3.0` (core 1.63.2).
- `provideCopilotKit({ defaultToolRendering: true })`; deleted
  `fallback-tool-card.ts` and both fallback paths in `initAgentStore` (the
  `component: tool.component || FallbackToolCard` default and the `'*'`
  auto-registration). Verified in the 0.3.0 source that the resolution order
  is named renderer → client tool (with component) → HITL → `'*'` → built-in
  `CopilotDefaultToolRenderer`, so tools without a component now fall through
  to the built-in card.
- `injectWidgetToolNames()` discriminator changed from
  `component !== FallbackToolCard` to `component !== undefined`.
- The D1.4 rewiring of `CopilotActivity` (consume
  `activityMessageRenderConfigs()`, pass the `agent` input) was already in
  place on this branch; 0.3.0's computed additionally merges the
  `ɵCOPILOTKIT_BUILT_IN_ACTIVITY_RENDERERS` multi-token, which is what makes
  step 4's `provideMCPApps()` renderer reachable from our shell without
  further changes. `CopilotActivity` itself stays until PR #6033 lands.
- Gate: green; dev server boots and serves.

### Step 2 — interrupts to `injectInterrupt`

- `assistant-chat.ts` now owns an `injectInterrupt` controller with a
  reactive `agentId` signal (follows the `ChatRegistry` chat switch);
  `interrupts` renders from `controller.interrupts()`, gated on
  `!isRunning()` so the buttons vanish the moment a resume run starts.
  `onResumeInterrupt` calls `controller.resolve(payload, interruptId)`.
- Deleted: `getPendingInterrupts` (the signal-priming hack) and
  `resumeInterrupt`/`InterruptResponses` (the `buildResumeArray` plumbing)
  from `agent-store-helper.ts`; the `resolvedInterruptId` optimistic-hiding
  signal in `chat-messages.ts`. The interrupt _view_ mapping
  (`metadata.suspendPayload` → message + option buttons) stays in
  `chat-messages.ts` — application knowledge, per D5.
- D5.1 resolved — it is real, with a twist: the controller's resolve path
  appends a client-side `role: 'tool'` message built from
  `decision.toolResults` for every interrupt that carries a `toolCallId`
  (ours always do). Server-side this is harmless (the resume path ignores
  `input.messages`, and `useServerMemory` marks the message as sent), but
  client-side `RenderToolCalls#getToolMessage` resolves tool results
  first-match, so the synthetic `{"selection":…}` message would permanently
  shadow the real booking result and flip the action card to "Failed".
  Mitigation: `AppHttpAgent.addMessage` drops tool messages whose
  `toolCallId` matches a pending interrupt — Mastra's
  `approveToolCall`/`resumeStream` remains the single source of the tool
  result, which reproduces the pre-migration wire behavior exactly.
  Post-migration analysis sharpened this: the synthesis is the client half
  of CopilotKit's own executor-less "interrupt tools" (BuiltInAgent:
  `interrupt.id === toolCallId`, reason `"tool_call"`, human response =
  tool result, server dedups via its `alreadyAnswered` set), while the
  AG-UI spec prescribes for our case that the _agent_ emits
  `ToolCallResult` against the original `toolCallId` on the resume run.
  The override is therefore gated on the reasons our server emits
  (`human_approval`, `tool_suspended`) so a future CopilotKit-style
  interrupt-tool demo would keep its synthesis; upstream issue
  [#6201](https://github.com/CopilotKit/CopilotKit/issues/6201) proposes
  gating the synthesis in CopilotKit itself.
- D5.2 resolved: `#startResume` indeed sends only `{ resume }`;
  forwarded props (agent mode) survive because `AppHttpAgent.requestInit`
  injects them into every request. The interrupt migration therefore depends
  on keeping `AppHttpAgent` (or on PR #6076), as predicted.
- Flow exercise: a temporary spec drove the full roundtrip against the
  `agui-mock` SSE infrastructure — controller surfaces the interrupt with
  `metadata.suspendPayload`, `resolve({selection:'creditCard'})` posts
  exactly the resume array the old `buildResumeArray` path sent
  (`[{interruptId, status:'resolved', payload}]`), and afterwards exactly one
  tool message (the server's) exists for the tool call. Spec was removed
  again after the gate (the three teaching spec variants stay untouched);
  worth re-adding permanently if regression cover is wanted.

### Step 3 — context to `connectAgentContext`, state factory decision

- Catalog context entries moved out of `initAgentStore`/`AppHttpAgent` into
  `connectAgentContext(() => entry)` at the two call sites. Per-agent scoping
  works via `ScopedContext.agentIds` (core 1.63.2, PR #5369): ticketing
  sends the full catalog, dashboard only the catalog id — verified that
  `core.runAgent` builds `input.context` through
  `ContextStore.getContextForAgent(agentId)`, so the server-side extraction
  by description is unchanged.
- Deleted: the `context` option in `InitAgentStoreConfig`, the context
  factory plumbing, and `mergePersistentContext` in `AppHttpAgent`.
- D8.2 decided: **keep the pull-model `state` factory.** The push variant
  (`agent.setState(plan)`) is a feedback loop with the existing mirror
  effect: `setState` → `onStateChanged` → `AgentStore.state` set with a
  fresh clone → mirror `setPlan` → new array refs → `plan()` recomputes →
  push effect fires again, indefinitely. Making push safe would need deep
  equality guards on both sides — more custom code than the one-line factory
  it replaces. This also means PR #6076 should keep covering the `state`
  factory (D4 note stands).
- `AppHttpAgent` is now down to: persistent `forwardedProps`, the `state`
  factory, the server-memory history filter, and the two interrupt/MCP
  guards from steps 2 and 4.

### Step 4 — MCP Apps middleware spike: **verdict: adopted**

- Server: `ag-ui-route.ts` wraps the agent with a module-level
  `MCPAppsMiddleware({ mcpServers: [{ type: 'http', url, serverId:
'hotels' }] })` (explicit `serverId` per D6) whenever the effective agent
  is `ticketingAgent` — or whenever the run carries
  `forwardedProps.__proxiedMCPRequest`, so widget-proxied MCP traffic is
  intercepted even while the mode selector points at `planningAgent`.
  `streamAgentEvents` gained an optional `middleware` and subscribes to
  `middleware.run(input, agent)` instead of `agent.run(input)`.
- Deleted server-side: the Mastra `MCPClient.listTools()` registration in
  `ticketing-agent.ts` (tool ownership moved to the middleware, resolving
  the double-registration risk from D1 point 1), and in
  `extended-mastra-agent.ts` the `_meta.ui` sniffing, `McpAppUiMeta`,
  `buildMcpAppsActivityContent`, and the `mcp-apps` snapshot branch
  (~100 lines). The prompt now references the raw `findHotels` name the
  middleware announces (it injects MCP tools under their unprefixed names,
  with `[UI Resource: …]` appended to the description).
- Client: `provideMCPApps()` from `@copilotkit/angular/mcp-apps` replaces
  the entire custom host — deleted `mcp-apps-widget.ts`,
  `mcp-apps-activity-renderer.ts`, `mcp-apps-content.ts`,
  `mcp-apps.provider.ts`, `mcp-apps.config.ts`. `hostInfo`/`hostContext`
  moved into the `provideMCPApps` config. New guard:
  `AppHttpAgent.requestInit` skips the server-memory filter for
  `__proxiedMCPRequest` runs so a concurrent widget refresh can never mark a
  user message as sent before the model saw it.
- Compatibility note: our MCP server registers tools via ext-apps
  `registerAppTool` with nested `_meta.ui.resourceUri`; verified that
  ext-apps stamps the flat SEP-1865 `_meta["ui/resourceUri"]` key alongside
  it, which is what the middleware filters on.
- Spike verification (no LLM needed): against the _real_ MCP server, a
  scripted run through `MCPAppsMiddleware` (fake agent emitting a
  `findHotels` tool call) confirmed: `findHotels` injected into
  `input.tools`; at run end the middleware executed the call, emitted
  `TOOL_CALL_RESULT` ("3 hotels found") plus an `ACTIVITY_SNAPSHOT` with
  `activityType: "mcp-apps"`, `serverId: "hotels"`, `serverHash`,
  `resourceUri: "ui://hotels/results.html"`, `toolInput`, and the full
  `CallToolResult` — before the held-back `RUN_FINISHED`; the snapshot
  validates against the shipped renderer's schema (`serverHash` required).
  A `__proxiedMCPRequest` (`tools/call` and `resources/read`) POSTed to the
  live `mastra dev` route returned the real tool result resp. the 322 kB
  app HTML without invoking any LLM. The LLM-driven end-to-end hotels chat
  should still be eyeballed once (D1 point 2: the tool now executes after
  the turn instead of mid-run).

**Revision 2026-07-29 — hybrid instead of full middleware.** The full
adoption conflicted with an earlier, deliberate decision this migration had
overridden: MCP tools hook in at _agent level_ (native `MCPClient.listTools()`
execution, mid-run, "Mastra Bordmittel first"). Reworked to a hybrid that
keeps both that decision and the official 0.3.0 frontend:

- `ticketing-agent.ts` registers the hotels MCP tools natively again
  (`hotels_findHotels`, prompt reverted); the module-level `listTools()`
  await — and with it the :3002 startup dependency — is back.
- `ExtendedMastraAgent` re-gained the `_meta.ui` sniffing and emits the
  `mcp-apps` snapshot itself, now including the `serverHash` the 0.3.0
  renderer requires. The hash comes from the route via the new
  `mcpAppsServerHashes` option (`getServerHash` over the same server config
  the proxy uses, so hash-based lookups resolve too).
- `MCPAppsMiddleware` no longer wraps normal runs; the route uses it solely
  to answer `__proxiedMCPRequest` runs (no agent, no LLM). Client side
  (`provideMCPApps`) unchanged.
- Verified: ai-server boots against the live MCP server (native
  registration), proxied `tools/call` (by serverId) and `resources/read`
  (by real serverHash) return live results through the route, and the
  snapshot shape passes the shipped `mcpAppsSnapshotContentSchema`
  (temporary spec, removed again). Build/lint/tests at baseline.

### Step 5 — descoped (unchanged)

Per D2: CopilotKit catalogs are Lit-only; `@a2ui/angular/v0_9` and the whole
legacy A2UI stack stay. From §4 only the styling-class idea was adopted
(step 6).

### Step 6 — housekeeping

- `@copilotkit/runtime` removed from `package.json` (D3; it was never
  imported — bonus: `@segment/analytics-node` no longer appears in build
  warnings). `@ag-ui/mcp-apps-middleware@0.0.3` added instead.
- Renaming our `provideMcpApps` became moot — step 4 deleted it.
- `a2ui-*` classes: the v0_9 renderer already emits semantic classes
  (`a2ui-column`, `a2ui-text-body`, …) that `styles.css` targets; the
  activity wrapper now additionally carries the stable `a2ui-surface` class.
- `@ag-ui/mastra` multimodal re-test: 1.1.1 **does** fix the stripping
  (images → `image` parts, audio/video/document → `file` parts), but it
  peer-depends on `@copilotkit/runtime@^1.60.1` and `@mastra/core >= 1.29`.
  Pin stays at 1.0.0 (per protocol/D7); the server-side re-injection
  workaround stays until that peer situation clears.

### Open points

- Re-check the two LLM-driven flows manually once (booking approval via
  `injectInterrupt`, hotels via MCP Apps middleware) — this session had no
  model API key; everything up to the LLM was exercised mechanically.
- The interrupt-roundtrip gate spec existed only transiently; consider a
  permanent variant if the teaching-spec story allows a fourth flavor.
- Proxied MCP requests run through the regular agent, so `isRunning()` is
  briefly true during widget refreshes (composer shows Stop). Cosmetic;
  revisit only if it confuses workshop participants.
- The shipped MCP Apps host announces a static `hostContext` (no dynamic
  theme push, D1 point 3) — acceptable today, our host config is static too.
- `ConfigService.mcpServerUrl` is no longer used by the app (the browser
  never talks to the MCP server); kept because `mcp-apps-demo` still hosts
  MCP apps browser-side, which is also why the MCP server keeps its CORS /
  private-network-access headers.
- Environment note (not caused by the migration): `@internal/ag-ui-server`
  resolves at `mastra dev` runtime only through a manually created
  `node_modules/@internal/ag-ui-server` symlink; any `npm install` prunes
  it. Recreate with
  `mkdir -p node_modules/@internal && ln -sfn ../../libs/ag-ui-server node_modules/@internal/ag-ui-server`,
  or wire it properly (e.g. a `file:` dependency with a package.json in
  `libs/ag-ui-server`). The symlink serves the in-place compiled
  `libs/ag-ui-server/*.js` (regenerate after edits with
  `npx tsc --build ai-server/tsconfig.json`); those emitted `.js` files and
  the root `tsconfig.tsbuildinfo` stay untracked.
