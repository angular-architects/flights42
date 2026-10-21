# CopilotKit 0.6.0 / AG-UI 1.0 migration

Status: phases A–E executed on 2026-10-19 on branch `copilotkit-v0.6.0`
(uncommitted, see the execution log); the abort row of phase E is open, and
phase F waits for the user's OK. Written 2026-10-19 on
`AGU-solution` (`5fe3109c`) from the published npm tarballs and upstream
sources. Every decision below is final. "Execute this document" means:
follow the rules, run phases A–E in order, and fill in the execution log at
the end.

Related docs: [copilotkit-0.5.0.md](copilotkit-0.5.0.md),
[a2ui-stock-simplification.md](a2ui-stock-simplification.md),
[copilotkit-runtime-migration.md](copilotkit-runtime-migration.md),
[upstream/ag-ui-mastra-issues.md](upstream/ag-ui-mastra-issues.md).

## Rules for the execution

1. **Start:** run `git status`. If the working tree has changes other than
   this document, stop and ask whether to commit, stash or carry them over.
   Then create the branch `copilotkit-v0.6.0` from `AGU-solution`.
2. **No commits, no pushes.** The user reviews the working tree.
3. **Order:** run phases A → E in order. A phase is done only when its
   "Done when" checks pass. After each phase, add a short entry to the
   execution log: what changed, deviations from this plan, check results.
4. **Code style** follows `AGENTS.md`:
   - braces on every block, no code comments;
   - named types next to their zod schema;
   - no `as` in `@if`.

   After every TypeScript change, run `npm run lint -- --fix`.

5. **Nothing beyond this plan:** add no new tests, docs or helpers. Specs
   that break because their subject was changed or deleted get updated or
   deleted with it.
6. **Servers:** smoke tests use the user's running `mastra dev` (port 3001)
   and MCP server (port 3002). Never start a second `mastra dev`. If a
   restart is needed, or nothing is running, ask the user. Smoke scripts
   (Playwright, curl) live outside the repo, in the session scratchpad.
7. **Stop and ask** in these cases:
   - a premise of this document turns out wrong (an API, type or behaviour
     differs);
   - a fix needs changes outside the listed files;
   - a check fails in a way this plan does not cover.
8. **Phase F** (AGU branches, labs) runs only after the user explicitly says
   OK.

## Decisions (final, do not reopen)

| Topic                     | Decision                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server hosting            | Keep our own AG-UI route; do not adopt the CopilotKit runtime (see Background).                                                                                                                                           |
| A2UI rendering            | Use CopilotKit's built-in renderer with `createAngularCatalog` and `a2ui: { catalog, includeSchema: false }`.                                                                                                             |
| A2UI actions              | Actions go through the agent (`a2uiAction` → `log_a2ui_event`), which reacts with client tools. Do not override `CopilotA2UICatalog.surfaceComponent`. Return to client-side events once CopilotKit has an official hook. |
| A2UI generation           | Variant B stays: our own `render_a2ui` tool plus `A2UIMiddleware({ a2uiToolNames: [] })` (result path, no streaming). Variant A is blocked by #2669.                                                                      |
| `developerMessagesAsUser` | Keep it. The adapter maps `developer` to `system` and does not persist it; the plan handoff needs it in the history.                                                                                                      |
| `withoutMemoryArgs`       | Keep it. It silences the Mastra warning for agents without memory.                                                                                                                                                        |
| `SentFilterMiddleware`    | Keep it, although 2.0.1 may make it redundant.                                                                                                                                                                            |
| `@a2ui/*` packages        | Stay at 0.10.x. Only `projects/a2ui-demo` and the server use them.                                                                                                                                                        |
| Approvals                 | Stay `suspend`-based; native `requireApproval` cannot carry the payment selection.                                                                                                                                        |

## Target versions

| Package                      | Now     | Target      | Note                                                                                   |
| ---------------------------- | ------- | ----------- | -------------------------------------------------------------------------------------- |
| `@copilotkit/angular`        | 0.5.1   | 0.6.0       | pins `@ag-ui/{client,core}` 1.0.2 and `@a2ui/web_core` 0.10.4 exactly                  |
| `@copilotkit/core` (dev)     | ^1.70.1 | ^1.79.1     | same family as 0.6.0                                                                   |
| `@ag-ui/client`, `core`      | 0.0.59  | 1.0.2 exact | not 1.0.3: a second copy breaks `selfManagedAgents` (`AbstractAgent` private members)  |
| `@ag-ui/mastra`              | 1.1.4   | 2.0.1       | peers client/core `>=1.0.0`; `@copilotkit/runtime` is an optional peer now             |
| `@ag-ui/a2ui-middleware`     | 0.0.10  | 0.0.13      | needs client >= 1.0 (`contentToText`)                                                  |
| `@ag-ui/a2ui-toolkit`        | 0.0.4   | 0.0.5       |                                                                                        |
| `@ag-ui/mcp-apps-middleware` | 0.0.3   | 0.1.2       | needs client >= 1.0 (`PROTOCOL_VERSION`)                                               |
| `@a2ui/angular`              | ^0.10.5 | unchanged   | `@a2ui/angular` 0.13 needs web_core ^0.14, whose `Catalog` signature breaks CopilotKit |
| `@a2ui/web_core`             | ^0.10.6 | unchanged   | CopilotKit nests its own 0.10.4                                                        |

## Phase A — dependencies and mandatory fixes

1. Bump every package in the table in one `npm install`.
   - Remove the `@copilotkit/runtime` override from `package.json` and
     delete `libs/copilotkit-runtime-stub`.
   - If npm keeps stale `peer: true` entries for `@copilotkit/runtime` in
     `package-lock.json`, delete them by hand and reinstall.
2. `ai-server/src/mastra/routes/ag-ui-stream.ts`: track whether a
   `RUN_ERROR` has already been written through `send`, whether forwarded or
   extra. In the `catch`, send a `RUN_ERROR` only if none was written.
   - Reason: client 1.0 forwards the events emitted before a source error,
     so the adapter's own `RUN_ERROR` arrives first.
   - The browser's `verifyEvents` rejects a second one ("already errored").
3. `ai-server/src/mastra/routes/dashboard-ag-ui-route.ts`: after
   `handleRenderToolCallEnd` returns a `RUN_ERROR`, end the run
   (`agUiAgent.abortRun()`) so that no adapter events follow it.
4. Make `ag-ui-simple/`, `ai-demo/` (uses `MastraAgent.getLocalAgent`) and
   `projects/simple-client/` compile against 1.0.
   - 1.0 removed the `THINKING_*` events and `BackwardCompatibility_0_0_47`.
   - The zod validators moved to `@ag-ui/core/schemas`.
   - The middleware API is unchanged.
5. `@ag-ui/mastra` 2.0 changes interrupts. They arrive only as
   `RUN_FINISHED.outcome` and resume only through `RunAgentInput.resume`, and
   a run carries at most one. `chat-messages.ts` already uses
   `injectInterrupt` on this path, so no code change is expected.

**Done when:**

- `npm ls @ag-ui/client @ag-ui/core` shows only 1.0.2.
- `ng build` passes.
- `npx tsc -p ai-server/tsconfig.json` passes.
- `ng test` and `npm run test:aimock` pass, apart from specs that phases B
  and C delete anyway (note them in the log).
- `npm run lint -- --fix` is clean.
- A booking with approval works live: the card appears, approval resumes the
  run, and `messageWidget` follows.

## Phase B — `<copilot-activity>`

1. Replace `app-copilot-activity` with `<copilot-activity [message] [agentId]>`
   from `@copilotkit/angular`:
   - in `src/app/domains/shared/ui-assistant/chat-messages/chat-messages.html`
     and `.ts`;
   - in `src/app/shell/dashboard/dashboard.html` and `dashboard.ts`.

   Always pass `agentId`; without it the A2UI action bridge does nothing.

2. Delete `src/app/domains/shared/util-copilotkit/activity/copilot-activity.ts`
   and `copilot-activity.spec.ts`. `background-task.ts` in the same folder
   stays.

**Done when:**

- build, tests and lint pass;
- an MCP hotels widget renders and its iframe does not reload repeatedly.
  `<copilot-activity>` uses `ChangeDetectionStrategy.Eager`, and the MCP
  content schema is zod, so a new `content` object reaches the renderer on
  every change-detection cycle.

## Phase C — client: built-in A2UI

1. **`src/app/app.config.ts`:**
   - Configure `provideCopilotKit({ a2ui: { catalog: customCatalog, includeSchema: false }, defaultToolRendering: true, enableInspector: false })`.
   - Remove `renderActivityMessages`, `provideA2uiCatalog` and
     `provideMarkdownRenderer`.
   - CopilotKit's `Text` renders plain text; check that no prompt relies on
     markdown inside A2UI `Text`.
2. **Catalog** (`src/app/domains/ticketing/ai/custom-catalog/catalog.ts`,
   `ticketing-extra-components.ts`):
   - Build it with
     `createAngularCatalog({ TicketWidget: { props: ticketWidgetSchema, description } }, { TicketWidget }, { catalogId: 'https://example.com/catalogs/flights42-a2ui-demo', includeBasicCatalog: true })`
     from `@copilotkit/angular/a2ui`.
   - The description text moves from `.describe()` to `description`.
   - The definitions object needs a cast (`as unknown as A2UICatalogDefinitions`).
     CopilotKit's A2UI entry point bundles zod 3.25, and our `zod/v3`
     schemas from zod 4 fail with TS2322.
   - Schemas stay on `zod/v3`, because web_core duck-types `_def.typeName`
     at runtime.
3. **`TicketWidget`** (`custom-catalog/ticket/`): props now arrive as plain
   values.
   - Use `props = input.required<TicketWidgetProps>()`.
   - Read the values directly, without `.value()`.
   - Drop the `surfaceId`/`componentId`/`dataContextPath` inputs,
     `initialTicketContext` and `initialProperty`.
   - Define `TicketWidgetProps` next to `ticketWidgetSchema` as a one-line
     mapped type, `{ [K in keyof T]: Exclude<T[K], { path: string }> }` over
     `z.infer<typeof ticketWidgetSchema>`. `A2UIProps` fails its constraint
     because of the zod mismatch.
   - Keep the `.dashboard-output` compact-mode check.
4. **`src/app/domains/shared/util-copilotkit/a2ui/`:**
   - Delete `a2ui-activity-renderer.ts` with its spec and `__screenshots__`,
     `provide-a2ui-catalog.ts`, `catalog-context.ts` and
     `a2ui-action-handlers.ts`.
   - In `a2ui-schema.ts`, remove `BoundProps` and keep `binding()`.
5. **Actions become client tools:**
   - Create `src/app/domains/ticketing/ai/tools/check-in.tool.ts`: a
     `createFrontendTool` named `checkIn` with parameters
     `{ flightId: number }` and `followUp: false`. Its handler navigates to
     `['/checkin', { ticketId: flightId }]`.
   - Register `checkIn` in `ticketing-agent-store.ts` and
     `src/app/shell/dashboard/dashboard-agent-store.ts`.
   - Add `followUp: false` to `src/app/shell/dashboard/tools/submit-flight-search.tool.ts`.
   - Delete `src/app/domains/ticketing/ai/actions/check-in-action.ts`,
     `submit-answer-action.ts` and
     `src/app/shell/dashboard/actions/dashboard-flight-search-action.ts`.
   - Remove the `registerHandlers` calls from `ticketing-chat-service.ts` and
     `dashboard.ts`.
6. **`src/app/domains/shared/util-copilotkit/init-agent-store.ts`:**
   - Remove `connectCatalogContext` and the `A2UI_CATALOG_CONTEXT` import.
   - Remove the unused `context` option and its loop, plus the
     `connectAgentContext` and `Context` imports.
   - Remove the `forwardedProps` option and the `EnvironmentInjector` /
     `runInInjectionContext` plumbing.
   - Delete `forwardedPropsMiddleware` from `agent-middlewares.ts`.
   - What stays: the `HttpAgent`, `developerMessagesAsUser`, the optional
     `attachSentFilter`, `updateRuntime({ selfManagedAgents })` and the four
     registration loops.
7. **Dashboard `preventCaching`:**
   - In `dashboard-agent-store.ts`, remove the `forwardedProps` option.
   - In `dashboard.ts`, pass the value with the message:
     `sendMessage(this.copilotKit, this.chat, content, { preventCaching: this.preventCaching() })`.
   - Adjust the doc comment in `dashboard-prefs.ts`.
   - This is safe because `core.runAgent` merges
     `{ ...properties, ...forwardedProps }`, so `a2uiAction` survives.
8. **Types:** after steps 4–5, no file in `src/` imports `@a2ui/angular` or
   `@a2ui/web_core` any more.
9. **CSS:** change the `a2ui-v09-*` selectors to the `copilot-a2ui-*`
   elements in `src/styles.css`,
   `src/app/domains/shared/ui-assistant/assistant-chat/assistant-chat.css`
   and `src/app/shell/dashboard/dashboard.css`.

Expected side effect: with A2UI active, CopilotKit renders tool calls named
`render_a2ui` as nothing, so the tool card disappears from the chat.

**Done when:**

- build, tests and lint pass;
- `grep -r "@a2ui/" src` finds nothing.

## Phase D — server

1. `ai-server/src/mastra/a2ui/with-a2ui-instructions.ts`:
   - Take the context entry whose description starts with
     `A2UI catalog capabilities` and append its value verbatim as the
     custom-components section, instead of `splitA2UISchemaContext`.
   - Move `readAgUiContext` into this file.
   - `ADD_BASIC_CATALOG` and `DISPLAY_PROMPT` stay.
2. `ai-server/src/mastra/a2ui/catalog-context.ts`: delete it.
   - `CopilotA2UISurface` pins every `createSurface.catalogId` to the client
     catalog (`normalizeA2UIOperations`).
   - `render-a2ui.tool.ts` therefore always uses `A2UI_DEFAULT_CATALOG_ID`.
   - The dashboard route stops passing `catalogId`. Remove the option from
     `compileDashboard` (`dashboard-dsl/compile-dashboard.ts`) and keep its
     default.
3. `ai-server/src/mastra/a2ui/render-a2ui.tool.ts`: remove `Modal` from
   `SINGLE_CHILD_COMPONENTS`. A v0.9 Modal has `trigger`/`content`, not
   `child`. `childShapeErrors` stays.
4. `ai-server/src/mastra/routes/route-utils.ts`: replace `withAbortSignal`.
   - After creating the agent, register
     `abortSignal.addEventListener('abort', () => agUiAgent.abortRun(), { once: true })`.
   - Today the override replaces the adapter's own signal, so `abortRun()`
     never reaches Mastra.
   - `withOverrides` stays for `withoutMemoryArgs`.
5. `ai-server/src/mastra/agents/ticketing-agent.ts`: the A2UI middleware
   becomes `new A2UIMiddleware({ a2uiToolNames: [] })`.
   - `injectA2UITool: false` is the default.
   - `[]` must stay. The default `['render_a2ui']` would switch on the
     streaming path, which paints before our tool has validated the surface
     and then skips the validated result.
6. `ai-server/src/mastra/routes/dashboard-ag-ui-route.ts`:
   - `.use(new A2UIMiddleware({ a2uiToolNames: [] }))` on the dashboard
     `AgUiAgent`.
   - Skip the cache lookup and the cache write when
     `forwardedProps.a2uiAction` is set. An action run carries the same
     messages as the dashboard run, so the hash would replay the dashboard.
7. Prompts:
   - `agents/ticketing-agent.prompt.ts`: replace the button-event contract
     (search form and "Button events").
     - Actions arrive as a `log_a2ui_event` tool result:
       `User performed action "<name>" on surface "<id>". Context: {…}`.
     - On "checkIn", call the `checkIn` tool with the `flightId` from the
       context.
     - On "submitAnswer", read the values from the context and call
       `findFlights`.
     - Remove every mention of `a2ui_form_response`.
   - `agents/dashboard-agent.prompt.ts`: for such a result, on "checkIn" call
     `checkIn`, on "dashboardFlightSearch" call `submitFlightSearch` with
     `from`/`to`. Do not render a new dashboard in that case.

Unchanged, despite the new versions:

- `parseRunAgentInput`, `agUiRouteConfig` + `.use()`;
- the `MCPAppsMiddleware` in `ticketing-agent.ts`;
- the dashboard `onEvent` hook and the cache replay's `ACTIVITY_SNAPSHOT`.

MCP Apps 0.1.2 now gives the model `structuredContent` as JSON, so the model
sees the hotel data.

**Done when:**

- `npx tsc -p ai-server/tsconfig.json` and lint pass;
- with `DISPLAY_PROMPT` on, the ticketing prompt contains the `TicketWidget`
  section from the client entry and no basic-catalog duplication.

## Phase E — verification

Run all checks again (`ng build`, `ng test`, `npm run test:aimock`, ai-server
typecheck, lint), then these smoke tests against the running servers.
Record each result in the log.

| Area           | Check                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HITL           | Book with approval, then `messageWidget`; cancel with approval; reject an approval.                                                                                               |
| Plan           | Plan handoff from plan mode to execution; the handoff message stays in the history.                                                                                               |
| MCP Apps       | Hotels widget renders; iframe proxy calls (`tools/call`, `resources/read`) work.                                                                                                  |
| A2UI chat      | Booked-flights table; `TicketWidget` on request; search form → submit → `findFlights`; `checkIn` button → navigation without a follow-up run.                                     |
| Dashboard      | Uncached and cached request; invalid spec yields exactly one `RUN_ERROR`; `checkIn` and `dashboardFlightSearch` navigate, and an action run neither replays nor writes the cache. |
| Travel planner | `untilIdle` background task shows progress and completes.                                                                                                                         |
| Abort          | Closing the stream during a booking whose tool is still running leaves the booking unexecuted.                                                                                    |
| Wire           | `forwardedProps` (`a2uiAction`, `preventCaching`) and the "A2UI catalog capabilities" context entry arrive on the server unchanged by `enforceOutgoingInput`.                     |

**Done when:** every row passes, or the log names the failure and the user
has decided how to proceed.

## Phase F — AGU branches and labs (only after the user's OK)

1. Propagate with the `agu-propagate` skill (`plan` → `run` → `verify`).
   Expect conflicts in `ticketing-agent-store.ts`, `ticketing-chat-service.ts`,
   `feature-flags/feature-flags.ts` and `ticketing-agent.prompt.ts`.
2. Update the labs in `../workshop-site/workshops/AGU/Labs`.
   - `02_A2UI.md` changes the most: `createAngularCatalog`, plain props,
     `<copilot-activity>`, actions through the agent, and the middleware
     options.
   - `03_MCP-Apps.md` and `04_HITL.md` still walk through `ag-ui-route.ts`;
     check only their line references.

## Background

**Upstream status (2026-10-19):**

- Our ag-ui PRs #2661–#2664 and #2691 are merged and shipped in 1.1.4. Their
  workarounds were removed on 2026-09-14 (`e1306697`, `032b9f6b`).
- Still open: #2666 (reasoning as text) and #2669 (`generate_a2ui` gets no
  data on `create`; the `a2ui-tool` code is identical in 2.0.1).
- CopilotKit #6507 (`sendMessage` on `AgentStore`, PR #6667) is open, so
  `agent-store-helper.ts` stays.

**Why not the CopilotKit runtime** (`@copilotkit/runtime` 1.79.1): our route
glue is only about 200 lines, and the runtime would save about 100 of them.
Against it:

- The dashboard cache short-circuit is impossible, because
  `beforeRequestMiddleware` can only return a `Request`.
- `registerCopilotKit` uses a fixed `resourceId`, which would share the
  plan's `scope: 'resource'` working memory across threads.
- It brings 44 direct dependencies plus LangChain peers, and pins
  `@ag-ui/a2ui-middleware` 0.0.10.
- `a2ui` is one options object for all agents; `mcpApps` only scopes
  servers; `.use()` is lost on `clone()`.
- Without `a2ui.agents`, the client's `a2uiCatalogAvailable: true` attaches
  A2UI with `injectA2UITool: true` to every agent.
- The labs walk through `ag-ui-route.ts`, and workshop decision D3 asks for a
  stack-independent server.

**Why actions go through the agent:** the built-in renderer sends every
action as a new run (`bridgeA2UIAction` → `properties.a2uiAction`) and has no
client hook. The only interception point is the accidental
`surfaceComponent` field, which is internal and pinned versions would have to
be re-checked on every bump.

**Why `includeSchema: false`:** with it, CopilotKit sends only the "A2UI
catalog capabilities" entry, which holds the catalog id and the custom
components including descriptions. `true` would add every basic component
(≈53 kB per request) without descriptions, plus two guideline entries the
server already has. The entry has no `agentIds`; it reaches every agent but
only lands on the request context.

**Why no streaming for `render_a2ui`:** `@ag-ui/mastra` buffers server-tool
calls, so the arguments arrive in one piece anyway. `streamServerToolCalls`
is agent-wide and must stay off for agents whose tools suspend. No middleware
option names a result-only tool; result detection matches `a2ui_operations`
in any tool result.

## Risks to watch

- Change-detection churn with `<copilot-activity>` (`Eager` CD plus zod
  content schemas), especially the MCP iframe.
- Model quality:
  - CopilotKit's catalog text replaces our readable section;
  - A2UI `Text` no longer renders markdown;
  - the model has to pick the right client tool for an action.
- An action run under `SentFilterMiddleware` sends no client messages, only
  the middleware's synthetic `log_a2ui_event` pair. Check that Mastra stores
  the pair and answers.
- Two web_core copies in `node_modules` (root 0.10.6, CopilotKit 0.10.4).
  They are harmless as long as `src/` imports none from the root.

## Execution log

### Phase A — 2026-10-19

Changes:

- Branch `copilotkit-v0.6.0` from `AGU-solution` (`5fe3109c`); the
  uncommitted `with-a2ui-instructions.ts` change was carried over.
- Bumped all packages from the table; removed the `@copilotkit/runtime`
  override and `libs/copilotkit-runtime-stub`.
- `ag-ui-stream.ts`: `send` tracks a written `RUN_ERROR`; the `catch` sends
  one only if none was written.
- `dashboard-ag-ui-route.ts`: `agUiAgent.abortRun()` after
  `handleRenderToolCallEnd` returns a `RUN_ERROR`.
- `ag-ui-simple/index.ts`, `ag-ui-simple/weather-tool-agent.ts`,
  `ai-demo/client/utils.ts`: `contentToText` from `@ag-ui/core`.
  `ai-demo/server` and `projects/simple-client` compiled unchanged.

Deviations (approved by the user):

- `npm install` failed with ERESOLVE even after removing the stale
  `peer: true` entries: npm puts optional peers into the peer-set conflict
  check, so `@copilotkit/runtime` → `openai` (peer `zod@^3`) clashed with the
  locked root zod 4. A fresh resolve worked. Fix: also delete the root
  `node_modules/zod` entry from the lock. Side effects: zod 4.5.2 → 4.6.7,
  `@modelcontextprotocol/ext-apps` 1.7.4 → 1.7.5, `phoenix` 1.8.13 → 1.8.15.
- `abortRun()` is not silent. A script against the real adapter showed that
  the already buffered `TOOL_CALL_RESULT` and a `RUN_FINISHED` (cancelled)
  still follow the extra `RUN_ERROR`; `detachActiveRun()` also lets the
  buffered result through. So `send` in `ag-ui-stream.ts` additionally drops
  every event after the first `RUN_ERROR`; `abortRun()` stays to stop Mastra.
- `ToolMessage.content` / `TOOL_CALL_RESULT.content` are now
  `string | ContentPart[]`. Besides the demos, this also broke
  `src/app/domains/ticketing/feature-travel-planner/travel-planner-page.ts`
  (not listed in the plan); fixed with `contentToText`.

Checks:

- `npm ls @ag-ui/client @ag-ui/core`: only 1.0.2.
- `ng build`, `ng build simple-client`, `npx tsc -p ai-server/tsconfig.json`:
  pass.
- `ng test`: 10 files / 25 tests pass. `npm run test:aimock`: 1 / 3 pass.
- `npm run lint -- --fix`: clean.
- Live (mastra dev on 3001, `ng serve` on 4200): "Book flight 5" → run ends
  with `outcome.type: "interrupt"`, the card shows three options; "Pay with
  credit card" sends `RunAgentInput.resume` (`status: "resolved"`), the
  resumed run calls `bookFlightTool` and `messageWidget`. No console errors.

### Phase B — 2026-10-19

Changes:

- `chat-messages.ts`/`.html` and `dashboard.ts`/`.html` use
  `<copilot-activity [message] [agentId]>` from `@copilotkit/angular`.
- Deleted `activity/copilot-activity.ts` and its spec;
  `background-task.ts` stays.

Deviations: none. For the live check, `USE_MCP` in
`feature-flags/feature-flags.ts` was set to `true` temporarily and reset
afterwards.

Checks:

- `ng build` passes. The `dashboard.css` budget warning (8.55 kB > 8 kB) is
  older than this migration.
- `ng test`: 9 files / 22 tests pass (the deleted spec had 3).
  `npm run test:aimock`: 3 pass. Lint clean.
- Live: "Find hotels in Frankfurt" renders the hotels MCP App. After the
  initial four frame navigations (sandbox + app, `about:blank` →
  `about:srcdoc`), 20 keystrokes in the composer and a widget "Refresh"
  caused no further navigations. The `resources/read` and `tools/call` proxy
  runs (`forwardedProps.__proxiedMCPRequest`) return.

### Phase C — 2026-10-19

Changes:

- `app.config.ts`: `a2ui: { catalog: customCatalog, includeSchema: false }`;
  removed `renderActivityMessages`, `provideA2uiCatalog` and
  `provideMarkdownRenderer`.
- Catalog via `createAngularCatalog` (cast to `A2UICatalogDefinitions`,
  schemas stay `zod/v3`); the description moved to `description`.
- `TicketWidget`: `props = input.required<TicketWidgetProps>()`, plain values;
  `TicketWidgetProps` is defined next to `ticketWidgetSchema`.
- Deleted the A2UI activity renderer (spec, screenshots),
  `provide-a2ui-catalog.ts`, `catalog-context.ts`, `a2ui-action-handlers.ts`
  and the three action files; `a2ui-schema.ts` keeps only `binding()`.
- New `tools/check-in.tool.ts` (`followUp: false`), registered in both agent
  stores; `submitFlightSearch` got `followUp: false`.
- `initAgentStore` and `forwardedPropsMiddleware` slimmed as planned; the
  dashboard passes `preventCaching` with `sendMessage`.
- CSS selectors moved to `copilot-a2ui-*`.

Deviations:

- CSS (approved by the user): a rename alone does not match the new DOM.
  - The Card host is now the box, so there is no inner `.a2ui-card`.
  - The wrappers are `copilot-a2ui-child > copilot-a2ui-node > copilot-slot`,
    all `display: contents`, instead of `a2ui-v09-component-host`.
  - The root column sits under
    `.a2ui-surface > copilot-a2ui-node > copilot-slot`.
  - Component ids are not DOM ids, neither before nor now, so the
    `#boarding-stack` rules match nothing. They were only renamed, as before.
  - `dashboard.css` was mapped accordingly.
  - In the chat, CopilotKit ignores our old card and button variables.
    `assistant-chat.css` now uses CopilotKit's `--a2ui-card-shadow`, styles
    the card chrome through selectors, and makes
    `copilot-a2ui-button .button` an outline button.
  - The `app-widget-container` rules in `styles.css` match no template any
    more (they were dead before this migration); they were only renamed.
    Likewise the `.a2ui-md-*` rules: `Text` no longer renders markdown.
- Follow-up after the user's review (approved): A2UI looked less polished
  than before.
  - Cause: `@a2ui/angular` injected a default theme on `:root` via
    `injectBasicCatalogStyles()`: `--a2ui-color-on-background: #333`, a light
    gray `--a2ui-color-surface`, `--a2ui-border-radius: 0.25rem`, and
    `--a2ui-font-size-*` on a 1.2 scale with line heights 1.2 / 1.5. Its
    `Text` gave headings `margin: 0` and token-based sizes.
  - CopilotKit defines none of these tokens, and its `Text` renders bare
    `h1`–`h5`, `span` and `small` with browser margins.
  - `styles.css` now defines the old tokens (light values) on
    `:where(:root)`. It maps them onto `copilot-a2ui-text` (margins,
    sizes, line heights, color) and onto button color/weight, image radius
    and text-field label color.
  - Verified against a baseline: `AGU-solution` as a scratch worktree,
    and the same A2UI operations (the latest chat table from the DB, both
    dashboard examples) fed to both clients via Playwright interception.
    The computed styles match, apart from a ±4 px text-field margin.
    Intentional difference: the dashboard chart image is no longer cropped,
    because CopilotKit sets `object-fit` inline.
- Also after the review: `chat-messages.ts` skips tool calls named
  `RENDER_A2UI_TOOL_NAME`. The surface already shows as its own activity
  bubble, and the tool call left an empty bubble.
- `TicketingChatService` lost its now unused `CopilotKit` injection.

Checks:

- `ng build` passes. The `dashboard.css` budget warning grew from 8.55 kB to
  8.91 kB (error limit 16 kB).
- `ng test`: 8 files / 20 tests pass (the renderer spec had 2).
  `npm run test:aimock`: 3 pass. Lint clean.
- `grep -r "@a2ui/" src`: no hits.
- Live, as a CSS check (server still before Phase D):
  - Dashboard examples 1 and 2 render as a three-column grid, with card
    chrome and the ticket stack.
  - A chat surface with cards and "Check in" buttons renders in the old
    style.
- The expected empty rendering of `render_a2ui` left an empty bubble in
  `chat-messages.html`. Fixed after the review (see above). A live re-check
  shows no empty bubble.

### Phase D — 2026-10-19

Changes:

- `with-a2ui-instructions.ts`: appends the value of the context entry whose
  description starts with `A2UI catalog capabilities` as
  `## Custom Components`; `readAgUiContext` moved in.
- Deleted `a2ui/catalog-context.ts`; `render_a2ui` always uses
  `A2UI_DEFAULT_CATALOG_ID`; `compileDashboard` lost its `catalogId` option;
  the dashboard route no longer reads a catalog id.
- `render-a2ui.tool.ts`: `Modal` removed from `SINGLE_CHILD_COMPONENTS`.
- `route-utils.ts`: `withAbortSignal` replaced by an `abort` listener that
  calls `agUiAgent.abortRun()`.
- `A2UIMiddleware({ a2uiToolNames: [] })` on the ticketing agent and on the
  dashboard `AgUiAgent`; the dashboard skips cache lookup and write when
  `forwardedProps.a2uiAction` is set.
- Prompts: the ticketing prompt describes the `log_a2ui_event` result and
  maps "checkIn" → `checkIn` and "submitAnswer" → `findFlights`; no
  `a2ui_form_response` left. The dashboard prompt maps "checkIn" →
  `checkIn` and "dashboardFlightSearch" → `submitFlightSearch`, without a new
  `renderDashboard`.

Deviations:

- `A2UI_DEFAULT_CATALOG_ID` needed a new home after `catalog-context.ts` was
  deleted. It now lives in `render-a2ui.tool.ts`;
  `with-a2ui-instructions.ts` and `compile-dashboard.ts` import it from
  there.
- The middleware's result text can carry `(component: <id>)` after the
  surface id; both prompts mention that.
- The `DISPLAY_PROMPT` check was done without the flag, because the
  `mastra dev` console belongs to the user's terminal. A scratch script ran
  `withA2uiInstructions(ticketingAgentPrompt)` with the context captured
  from a real browser request.
- Follow-up at the user's request (2026-10-20): with `withAbortSignal` gone,
  `withOverrides` had a single user. It is now folded into
  `withoutMemoryArgs`, a `Proxy` that only replaces `stream`. A `Proxy` is
  required because Mastra's `Agent` uses `#private` members. Upstream issue
  [ag-ui#3123](https://github.com/ag-ui-protocol/ag-ui/issues/3123) asks the
  adapter to omit `memory` for agents without memory; a comment in
  `route-utils.ts` links it. Checked with the route harness and an uncached
  dashboard run.
- Follow-up at the user's request (2026-10-20): `dashboard-ag-ui-route.ts`
  now shows only the flow: parse, cache lookup, replay or run with
  `renderDashboard` interception, cache write. Everything else moved
  unchanged to the new `routes/dashboard-utils.ts`. Cache hit and miss
  share one `streamSSE`. Checked with the route harness (invalid spec →
  exactly one `RUN_ERROR`) and dashboard smoke tests (miss writes, hit
  replays, `preventCaching` and action runs neither read nor write the
  cache, "Check in" and "Search" navigate).

Checks:

- `npx tsc -p ai-server/tsconfig.json` and lint pass.
- The browser sends exactly one context entry, "A2UI catalog capabilities…"
  (3561 chars, no `agentIds`), plus `forwardedProps.a2uiCatalogAvailable`.
- The generated prompt ends with `## Custom Components`, which lists only
  `TicketWidget` (schema plus description) for catalog
  `https://example.com/catalogs/flights42-a2ui-demo`. No basic component
  appears in that section.

### Phase E — 2026-10-19

Checks:

- `ng build`, `ng build simple-client`: pass.
- `ng test` 20/20, `npm run test:aimock` 3/3.
- `tsc` passes for the ai-server, `ag-ui-simple` and both `ai-demo` projects.
- Lint clean.

Setup: the user's `mastra dev` (3001); `ng serve` (4200) and the MCP
server (3002) were started by Claude with the user's consent and stopped
afterwards.

Smoke tests ran as Playwright scripts against the real servers. One check
used a scratch harness: the real route handler in a Hono app with a fake
Mastra agent.

| Area           | Result | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HITL           | pass   | Book 6 → "Pay with bonus miles" → `resume` → booked, `messageWidget`. Cancel 6 → "Accept" → cancelled. Cancel 50 → "Decline" and book 7 → "Cancel": bookings unchanged, cards show "Status: Cancelled". No console errors.                                                                                                                                                                                                                                                                                               |
| Plan           | pass   | Plan mode: "Which flights did I book?", "rebook flight #50 for #51" → plan (book 51, cancel 50) → Execute. Mode switches to execution; both steps run in order with their approvals and one summary `messageWidget`. The handoff goes out as `role: user` (`developerMessagesAsUser`) and is stored in the thread's Mastra memory.                                                                                                                                                                                       |
| MCP Apps       | pass   | Checked after Phase B and again after Phase D. The hotels widget renders; 20 keystrokes plus a widget refresh cause no further frame navigations; the `resources/read` and `tools/call` proxy runs return.                                                                                                                                                                                                                                                                                                               |
| A2UI chat      | pass   | Booked-flights table (`render_a2ui`); `TicketWidget` on request; search form → filled → "Search flights" → action run with resolved context `{from, to}` → `findFlights`; "Check in" → action run → `checkIn` → `/checkin;ticketId=516`, no follow-up run. One of three "Check in" attempts failed earlier: the generated surface had no matching button.                                                                                                                                                                |
| Dashboard      | pass   | Cache miss writes one cache file, the repeat replays it (`cached: true`). With "Prevent caching": LLM path, no write. "Check in" → `checkIn` → `/checkin;ticketId=1`; "Search" → `submitFlightSearch` → flight search. Action runs show no replay, no `renderDashboard`, no cache write. Invalid spec (harness): exactly one `RUN_ERROR`, no events after it, and Mastra's `abortSignal` fires.                                                                                                                          |
| Travel planner | pass   | Default form → Flights → Hotels → Travel Plan go from `active` to `done` (14 `mastra-background-task` activity events); after about 8 s: 2 flight widgets, 1 hotel widget, summary.                                                                                                                                                                                                                                                                                                                                      |
| Abort          | open   | Stop about 0.5 s after "Book flight 8": the request ends, no approval card, the thread memory holds only the user message, flight 8 is not booked. Harness: request abort → `abortRun()` → Mastra's `abortSignal` fires, the run ends. Stop right after "Pay with credit card": flight 8 **was booked**, because the resumed `bookFlight` finishes within milliseconds (flight lookup cached from the first run) before the abort arrives. A tool that is still running cannot be produced live with the existing tools. |
| Wire           | pass   | Request bodies at the network layer carry `forwardedProps.a2uiAction.userAction` (name, surfaceId, sourceComponentId, resolved context), `preventCaching` (`true`/`false`) and the context entry "A2UI catalog capabilities…" (3561 chars). The server acts on them: cache skip, `log_a2ui_event` reactions, `## Custom Components`. A harness case also showed that a source error yields exactly one `RUN_ERROR`.                                                                                                      |

Observations (no code change):

- The follow-up run after a client tool that keeps `followUp` (e.g.
  `findFlights` after "submitAnswer") carries `forwardedProps.a2uiAction`
  again, so the middleware injects a second `log_a2ui_event` pair. In the
  test, the model still answered correctly with a `messageWidget`.
- Tool cards of `followUp: false` tools (`checkIn`) stay on "Running".
- The empty bubble for `render_a2ui` was fixed after the review (see Phase C).
- Bookings are in memory and reset on every `mastra dev` reload. They were
  back at `1, 2, 50, 516` after the tests. The cache file from the
  cache-miss test was deleted.
