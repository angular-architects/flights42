# CopilotKit 0.4.0 / Angular 22 / Mastra 1.63 upgrade plan

Status: Phases A–C executed (see the migration log at the end); Phases D–F pending. Written 2026-08-29 from the published
npm tarballs and the `ng update` listing.
Related docs: [copilot-migration.md](copilot-migration.md) (0.3.0 evaluation),
[copilotkit-0.3.0-changelog.md](copilotkit-0.3.0-changelog.md) (last executed
migration), [migration.md](migration.md) (Option 2: keep the flights shell),
[bridge.md](bridge.md) (workflow step bridge).

## Decisions already taken

These came out of the analysis that preceded this plan and are not re-opened
here:

- Keep `ExtendedMastraAgent` and the custom AG-UI routes. `@ag-ui/mastra@1.1.2`
  does not map `workflow-step-*`, custom `data-*` chunks, `tripwire`, hidden
  tools, MCP Apps or `a2ui-surface` activities; the workshop chapters depend on
  all of them.
- Keep the own A2UI path (`renderA2uiTool`, catalog instructions,
  `@a2ui/angular` renderer). The upstream path is a subagent that renders via
  `render_a2ui` tool calls into `@copilotkit/a2ui-renderer`, which is Lit only
  (`a2ui.catalog: Catalog<LitComponentImplementation>`).
- No `@copilotkit/runtime` on the server. Hooks are request-level only (no
  per-event hook for the dashboard compiler), it ships its own thread store,
  and pulls 45 dependencies including a second `hono`.

## Target versions

| Package                                                             | Current | Target   | Driver / note                                                                                                           |
| ------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@angular/*`, `@angular/cli`, `@angular/build`                      | 21.2.x  | 22.1.x   | required by `@copilotkit/angular@0.4.0` (peer `^22.0.0`)                                                                |
| `typescript`                                                        | ~5.9.2  | 6.0.x    | hard requirement of `@angular/compiler-cli@22` (`>=6.0 <6.1`); 7.x is **not** allowed                                   |
| `@angular/cdk`                                                      | 21.2.x  | 22.1.x   | peer of `@copilotkit/angular@0.4.0`                                                                                     |
| `@angular/material`                                                 | 21.2.x  | 22.1.x   | `ng update`                                                                                                             |
| `@ngrx/signals`, `@ngrx/store`                                      | 21.x    | 22.0.x   | `ng update @ngrx/store`                                                                                                 |
| `@angular-architects/ngrx-toolkit`                                  | 21.0.1  | 21.0.1   | no 22 release yet; keep with `overrides` for its Angular 21 peers — see risks                                           |
| `@angular-architects/native-federation`                             | 21.2.4  | 22.1.2   | peers `@angular/build ~22.1.0`; keep `@angular/build` on 22.1.x                                                         |
| `angular-eslint`                                                    | 21.1.0  | 22.1.0   | peers eslint `^9 \|\| ^10`                                                                                              |
| `eslint`                                                            | 9.39.x  | stay 9.x | `@softarc/eslint-plugin-sheriff` peers `^8 \|\| ^9`; do not move to 10                                                  |
| `typescript-eslint`                                                 | 8.47.0  | 8.68.x   | peers TS `<6.1.0`; needed for TS 6                                                                                      |
| `ngx-markdown`                                                      | 21.0.1  | 22.0.0   | peers `@angular/core ^22`                                                                                               |
| `@copilotkit/angular`                                               | 0.3.0   | 0.4.0    | core 1.69.3; adds `@copilotkit/web-inspector`, `@copilotkit/a2ui-renderer`, `@copilotkit/core`                          |
| `@ag-ui/client`, `@ag-ui/core`                                      | 0.0.57  | stay     | pinned exactly by `@copilotkit/angular@0.4.0`; bumping to 0.0.59 would duplicate the package                            |
| `@ag-ui/mcp-apps-middleware`                                        | 0.0.3   | stay     | latest                                                                                                                  |
| `@a2ui/angular`                                                     | 0.10.4  | 0.10.5   | peers `@angular/core ^21.2.5` and `zod ^3` — see risks                                                                  |
| `@a2ui/web_core`                                                    | 0.10.5  | 0.10.6   |                                                                                                                         |
| `@mastra/core`                                                      | 1.43.0  | 1.63.2   | no breaking change for used APIs between 1.43 and 1.63 (changelog checked)                                              |
| `@mastra/libsql` / `memory` / `mcp` / `client-js` / `observability` | various | latest   | move together with core                                                                                                 |
| `mastra` (CLI)                                                      | 1.14.0  | 1.27.2   | peers `@mastra/core >=1.50`; must be bumped with core                                                                   |
| `@ag-ui/mastra`                                                     | 1.0.0   | 1.1.2    | for `convertAGUIMessagesToMastra(messages, lookupMessages)`; brings zod 3 and a non-optional `@copilotkit/runtime` peer |
| `@ai-sdk/openai`                                                    | 3.0.x   | 4.0.x    | uses `@ai-sdk/provider 4.0.0` = Mastra `provider-v7`; supported                                                         |
| `zod`                                                               | 4.4.x   | 4.5.x    |                                                                                                                         |
| `vitest`, `@vitest/browser-playwright`, `@vitest/coverage-v8`       | 4.0.x   | 4.1.x    | `@angular/build@22` peers `vitest ^4.0.8`                                                                               |
| `jsdom`                                                             | 27.x    | 30.x     |                                                                                                                         |
| `@copilotkit/aimock`                                                | 1.37.x  | 1.39.x   | peers `vitest >=3`                                                                                                      |

## Risks found up front

1. **TypeScript 6.0.** Angular 22 requires exactly the 6.0 line. TS 6 removes
   or deprecates several legacy options; our tsconfigs use `module: preserve`
   (root), `module: ESNext` + `moduleResolution: bundler` (ai-server, mcp-server)
   and `paths` without `baseUrl`, so no removed option is in use. Expect new
   strictness diagnostics rather than config failures. `mastra dev` bundles with
   its own toolchain and does not read the project TS version.
2. **`@angular-architects/ngrx-toolkit` has no Angular 22 release.** 10 files
   in `src/` use it, but only two features: `withDevtools` (6 stores) and
   `withResource` (1 store). Decision: install 21.0.1 with `overrides` for its
   `@angular/core` / `@ngrx/signals` / `@ngrx/store` peers and verify both
   features after the upgrade (Redux DevTools shows the stores; the resource
   store still loads). If a 22.x release exists when we execute, take it and
   drop the override. Peer overrides are collected in one block:

   ```json
   "overrides": {
     "@angular-architects/ngrx-toolkit": {
       "@angular/core": "$@angular/core",
       "@ngrx/signals": "$@ngrx/signals",
       "@ngrx/store": "$@ngrx/store"
     },
     "@a2ui/angular": {
       "@angular/core": "$@angular/core"
     },
     "@ag-ui/mastra": {
       "@copilotkit/runtime": "npm:empty-npm-package@1"
     }
   }
   ```

3. **`@a2ui/angular@0.10.5` peers Angular `^21.2.5` and zod 3.** It already runs
   against zod 4 today (see [migration.md](migration.md) on zod v3/v4); the
   Angular peer needs an `overrides` entry or `--legacy-peer-deps`. Verify the
   custom catalog (`ContextFromSchema`, `createCustomComponent`) after the
   upgrade.
4. **`@ag-ui/mastra@1.1.2` declares `@copilotkit/runtime` as a non-optional
   peer.** npm 7+ auto-installs peers, which would drag the runtime in. Prevent
   with `overrides` (`"@copilotkit/runtime": "npm:empty-npm-package@1"`) or
   `--legacy-peer-deps`; the `/copilotkit` subpath is never imported.
5. **Interrupt wire format.** Not affected as long as `ExtendedMastraAgent`
   stays (it emits `human_approval` / `tool_suspended` and `metadata.*`); only
   relevant if someone swaps in `MastraAgent`.

## Phases

Each phase ends with a green `npm run build`, `npm run test`, `npm run lint`
(with `--fix`), the ai-server starting, and one commit. Do not mix phases in one
commit — the book and slides are updated from the commit history.

### Phase A — Angular 22 + TypeScript 6

1. Add the `overrides` block from risk 2 to `package.json` (covers risks 2, 3
   and 4).
2. `ng update @angular/cli@22 @angular/core@22` (runs the v22 schematics),
   then `ng update @angular/material@22 @ngrx/store@22 angular-eslint@22 @angular-architects/native-federation@22`.
3. `npm i -D typescript@6.0 typescript-eslint@8.68`, `npm i ngx-markdown@22 @angular/cdk@22`.
4. Fix TS 6 diagnostics across `src/`, `projects/a2ui-demo`, `projects/simple-client`,
   `ai-server/`, `libs/`, `mcp-server/` (all share the root `tsconfig.json`
   references or their own configs).
5. Verify: all three Angular projects build; `npm run test`; `npm run test:aimock`;
   `npm run mcp-server:app:build` (Vite); `ng lint --fix`.

### Phase B — `@copilotkit/angular` 0.4.0

The public API is additive: no export was removed compared to 0.3.0; new are
`injectCapabilities`, `CopilotChatViewInputMeasure` and the inspector token.
Everything we import (`provideCopilotKit`, `provideMCPApps`, `injectAgentStore`,
`injectInterrupt`, `InterruptController`, `RenderToolCalls`, `ToolRenderer`,
`AngularToolCall`, `AgentStore`, `Message`) still exists.

1. Pin `@copilotkit/angular` to `0.4.0`; confirm `@ag-ui/client`/`core` stay
   deduplicated at 0.0.57 (`npm ls @ag-ui/client`).
2. Check `node_modules/@copilotkit/angular/dist/styles.css` for changed class
   names if it is imported anywhere.
3. Smoke test the four integration points: chat send/stop, interrupts
   (`bookFlight` payment choice, approval flow), MCP Apps widget (hotels
   server, proxied request), `a2ui-surface` activity renderer with the custom
   catalog.
4. Record every behavioural difference in a `copilotkit-0.4.0-changelog.md`
   in the same format as the 0.3.0 changelog.

### Phase C — CopilotKit Inspector

How it works in 0.4.0 (verified in the package source):

- The `CopilotKit` service injects a `CopilotInspector` service. When
  `provideCopilotKit(...)` is present, the app runs in the browser and
  `isDevMode()` is true, it lazily imports `@copilotkit/web-inspector`, defines
  the Lit web component and appends it to `document.body`. Nothing to wire.
- `provideCopilotKit({ enableInspector })` forces it on or off; production
  builds never mount it. Tests can override
  `ɵCOPILOTKIT_INSPECTOR_DEVELOPMENT_MODE` (internal token).
- Panes: Home, What's New, Workbench (Threads, Memory), Inspect (Agent, AG-UI
  Events, Frontend Tools, Capabilities, Context). Threads/Memory and the
  "Runtime" status need a CopilotKit runtime — with our self-managed
  `AppHttpAgent`s they show "offline"; the Inspect group works from the client
  core alone.

Tasks:

1. Leave the default (on in dev) and verify the launcher appears in
   `ng serve`; check that it lists our agents and streams the AG-UI events of a
   run, including our custom fields (`stepName` on `TOOL_CALL_START`,
   `ACTIVITY_SNAPSHOT` for `mcp-apps` / `a2ui-surface`, `outcome.interrupts`).
2. Check for z-index / layout collisions with the assistant sidebar and the
   MCP Apps iframe; the inspector renders in its own shadow DOM but docks left
   by default.
3. Disable it in the Vitest browser tests (`enableInspector: false` in the test
   providers) so it does not mount into the test document.
4. No `enableInspector: true` in `app.config.ts` — the default already mounts
   it in dev builds. Note for slides: it appears without any wiring, and the
   Threads pane is CopilotKit-runtime only.

### Phase D — Mastra stack

1. Bump `@mastra/core@1.63.2`, `@mastra/libsql`, `@mastra/memory`, `@mastra/mcp`,
   `@mastra/client-js`, `@mastra/observability`, `@mastra/loggers`, `mastra@1.27.2`,
   `@ag-ui/mastra@1.1.2` (with the override from risk 4), `@ai-sdk/openai@4`,
   `zod@4.5`.
2. Start `npm run ai-server`; check the `mastra dev` cache location note in the
   project memory still applies; run every agent once from Studio.
3. Regression scenarios: ticketing agent with MCP tools (`USE_MCP` on and off),
   `bookFlight` suspend/resume, tripwire via the guard processors, travel
   planner workflow (step events and in-step tool calls), travel refinement
   plan state, dashboard route incl. cache replay.
4. Expect a new warning for memory-less agents only if someone removed the
   `hasOwnMemory()` guard — keep it.

### Phase E — `libs/ag-ui-server` cleanup (enabled by Phase D)

Delete, one commit each, re-running the Phase D scenarios after every step:

1. Multimodal user-part injection (`injectMultimodalUserParts`, `agUiPartToCorePart`)
   — `convertAGUIMessagesToMastra` 1.1.2 maps image/audio/video/document/binary.
2. Thought-signature cache and `memory-store.ts` — core 1.57 preserves provider
   metadata; agents with memory keep it server-side. Keep only if a Gemini
   client-tool continuation test fails.
3. `toolName` rehydration — pass the full history as `lookupMessages`, or drop
   the client-side `useServerMemory` filtering in `AppHttpAgent` and let
   Mastra memory dedupe.
4. `tool-call-approval` branch and `approveToolCall` / `declineToolCall` resume
   path — `requireApproval` is unused; approvals are `suspend` based.
5. `sse.ts` (already unused) and the deprecated aliases in `step-bridge.ts`.
6. Move the plan state from the bridge into the `RequestContext` (core 1.50
   stopped cloning it for tools); the bridge keeps `emit`, `emitToolCall`,
   `emitStateSnapshot`.
7. Test whether core 1.63 forwards `workflow-step-*` chunks from a
   workflow-as-tool reliably; if yes, drop `data-step-status` and
   `reportStepStatus`'s writer path in `ai-server/src/mastra/workflows/bridge.ts`
   and update [bridge.md](bridge.md).
8. Optional: bounded validate→retry loop in `renderA2uiTool` (the only point
   where the upstream A2UI tool is ahead).

### Phase F — remaining dependencies

`vitest` 4.1 + `@vitest/*`, `jsdom` 30, `@copilotkit/aimock` 1.39, `prettier`,
`@a2ui/web_core` 0.10.6, `hono` 4.13. Independent of the phases above; run
`npm run test` and `npm run test:aimock` afterwards.

## Verification checklist (end state)

- [ ] `npm run build` for `flights`, `a2ui-demo`, `simple-client`
- [ ] `npm run test`, `npm run test:aimock`, `npm run lint`
- [ ] `npm run ai-server`, `npm run mcp-server` start; Studio shows all agents
- [ ] Chat: send, stop, markdown rendering (`ngx-markdown` 22)
- [ ] Interrupts: `bookFlight` payment choice, cancel path
- [ ] Guardrails: off-topic / blocked-words / prompt-injection show the tripwire message
- [ ] Travel planner: `STEP_STARTED/FINISHED` and grouped in-step tool calls
- [ ] Travel refinement: live `STATE_SNAPSHOT` per plan mutation
- [ ] MCP Apps: hotels widget renders and proxied calls work
- [ ] A2UI: basic catalog and custom catalog components render; Dashboard cached and uncached
- [ ] Inspector: mounts in dev, absent in `ng build --configuration production`, absent in tests
- [ ] `npm ls @ag-ui/client zod hono` shows no unintended duplicates

## Out of scope (decided)

- Switching to `@copilotkit/runtime` or `registerCopilotKit`.
- Upstream A2UI injection (`getA2UITools`, `a2ui-middleware`, Lit renderer).
- Replacing `ExtendedMastraAgent` with `MastraAgent`.

## Migration log

### Phase A — executed 2026-08-29 on branch `copilotkit-v0.4.0`

- `ng update @angular/cli@22 @angular/core@22 @angular/material@22 @ngrx/signals@22 angular-eslint@22 ngx-markdown@22 @angular-architects/native-federation@22 --force`
  (`--force` needed for the Angular 21 peers of `@a2ui/angular` and
  `@angular-architects/ngrx-toolkit`, and for `typescript-eslint` 8.47 vs
  TS 6). Result: Angular 22.1.4/CLI 22.1.6, TypeScript 6.0.3, `@ngrx/signals`
  and `@ngrx/operators` 22.0.0, `ng-packagr` 22.1.1; `typescript-eslint` bumped
  to 8.68.0 afterwards.
- `overrides` in `package.json` extended to `@angular/common` and
  `@angular/platform-browser` for `@a2ui/angular` and the ngrx-toolkit — the
  peer check also covers those two packages, not only `@angular/core`.
- The `@ngrx/operators` migration collection crashed
  (`20_0_0-rc_0-tap-response` is CJS in an ESM package); the packages were
  already installed at that point and compile, so no manual migration was
  needed.
- v22 schematics: `ChangeDetectionStrategy.Eager` was added to 21 components
  that did not declare a strategy, and `nullishCoalescingNotNullable` /
  `optionalChainNotNullable` were suppressed in the three `tsconfig.app.json`
  files. Both reverted: all 21 components are signal-based and now run with the
  v22 OnPush default (which `@angular-eslint/prefer-on-push-component-change-detection`
  22 enforces anyway), and the builds produce no diagnostics without the
  suppressions.
- `@angular-architects/native-federation` 22: `loadRemoteModule` now comes from
  `@angular-architects/native-federation` instead of
  `@softarc/native-federation-runtime` ([wrapper.ts](../src/app/domains/shared/ui-federation/wrapper.ts)).
- Verified: `ng build` for `flights`, `a2ui-demo`, `simple-client`; `ng test`
  (25 passed); `test:aimock` (3 passed); `ng lint`; `tsc -p ai-server` with
  TS 6; `mcp-server:app:build`.
- Observed for Phase D: `@copilotkit/runtime@1.63.1` is still installed as
  the peer of `@ag-ui/mastra@1.0.0` — the alias override only takes effect
  once `@ag-ui/mastra` itself is reinstalled.

### Phase B — executed 2026-08-29

- `@copilotkit/angular` pinned to 0.4.0 (bundles `@copilotkit/core` 1.69.3,
  `@copilotkit/web-inspector`, `@copilotkit/a2ui-renderer`,
  `@copilotkit/web-components`). No source change was needed — the 0.3.0 API
  surface is a strict subset of 0.4.0.
- `@ag-ui/client` / `@ag-ui/core` stay deduplicated at 0.0.57. The only
  0.0.54 copies in the tree come from `@copilotkit/runtime@1.63.1`, which is
  still pulled in as the peer of `@ag-ui/mastra@1.0.0` and disappears in
  Phase D.
- `@copilotkit/angular/styles.css` is not imported anywhere, so no class-name
  check was needed.
- Verified: `ng build` for all three projects, `ng test` (25 passed),
  `test:aimock` (3 passed), `ng lint`. The Vitest browser tests use
  `provideCopilotKit` and therefore mount the Inspector (dev mode); the run
  logs no inspector errors — the explicit opt-out is done in Phase C.
- The manual smoke test of chat, interrupts, MCP Apps and the A2UI activity
  renderer is done together with the Inspector check in Phase C.

### Phase C — executed 2026-08-29

- Inspector verified in a headless-Chromium run against `ng serve` + `mastra dev`
  (`ai-server`, OpenAI). It mounts without any wiring: `cpk-web-inspector`
  is appended to `document.body` with a shadow root as soon as
  `provideCopilotKit` is present in a dev build. `enableInspector` is **not**
  set in `app.config.ts`.
- With our self-managed `AppHttpAgent`s the Home pane shows _Runtime:
  Offline — Runtime URL not configured_ and _Live updates: Disconnected_
  (expected — no CopilotKit runtime). The Inspect group works from the
  client core alone: _AG-UI Events_ listed all 24 events of a
  `ticketingAgent` run (`RUN_STARTED` … `TOOL_CALL_*` … `RUN_FINISHED`) with
  agent id, timestamp and raw payload; _Agent_ shows the agent.
- Smoke test (Phase B + C): chat send/stop, `findBookedFlightsTool`,
  `bookFlight` suspend → payment options rendered from `suspendPayload` →
  resolve with _Pay with credit card_ → `TOOL_CALL_RESULT` and success card,
  `renderA2uiTool` → one `a2ui-surface` activity rendered by `@a2ui/angular`.
  No console errors. MCP Apps not exercised (`USE_MCP` is `false` on this
  branch).
- Known UI collision: the inspector launcher is fixed at the top-right
  (`right: 14px`, no public option to move it — `launcherHudSide` only
  flips its HUD) and overlaps the close button and the mode `<select>` of
  the assistant panel header while the panel is open. The panel still closes
  via the toggle button; decide whether to shift the header controls in dev
  or live with it.
- Vitest browser specs that call `provideCopilotKit` now pass
  `enableInspector: false` (four specs), so the inspector is not mounted into
  the test document. `ng test` 25 passed, `ng lint` clean.
- The Playwright scripts used for the smoke test live in `tmp/` (gitignored):
  `tmp/smoke.mjs`, `tmp/inspector.mjs`.
