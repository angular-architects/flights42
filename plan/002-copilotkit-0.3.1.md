# CopilotKit `@copilotkit/angular` 0.3.0 → 0.3.1 — migration report

Written 2026-08-16 on branch `copilotkit-v0.3.0`. Basis: byte diff of the
published npm tarballs (`0.3.0` vs `0.3.1`, plus their pinned
`@copilotkit/{core,shared,web-components,a2ui-renderer}` 1.63.2 vs 1.66.0),
not release notes — upstream has no public changelog for 1.64/1.65/1.66.

## Verdict

0.3.1 is a patch release with **no breaking changes and no new Angular API**.
The Angular package itself changed in exactly one function; everything else
arrives through the transitive core bump. Migration cost: one version string.
Two of the core fixes are directly relevant to this repo — the parallel
tool-call ordering fix in particular.

## 1. What actually changed

### 1.1 `@copilotkit/angular` 0.3.0 → 0.3.1

The whole diff in `dist/`:

- `CopilotChatAssistantMessageRenderer.processMathEquations` was lifted out of
  the class into a module-level `processMathEquationsInHtml`, and the
  inline-math regex was tightened:

  ```
  0.3.0:  /\$([^$]+)\$/g
  0.3.1:  /(?<!\\)\$(?!\s)([^$\n]*?\S)\$(?!\d)/g
  ```

  A closing `$` may no longer be preceded by whitespace or followed by a digit.
  Effect: a price range such as `$349 … $289` in an assistant message is no
  longer swallowed into one KaTeX expression.

- `dist/index.d.ts` is otherwise identical (only the removed private method).
- `peerDependencies` unchanged: `@angular/{core,common,cdk}` `^20 || ^21 || ^22`,
  `rxjs ^7.8`. No engines constraint.
- Dependency pins moved 1.63.2 → 1.66.0 for `core`, `shared`, `web-components`,
  `a2ui-renderer`.

**Relevance here: near zero.** Only [simple-client](../projects/simple-client/src/app/app.ts)
uses `CopilotChat` and therefore CopilotKit's markdown renderer. The main app
runs its own chat shell and renders assistant text via ngx-markdown
([message.ts](../src/app/domains/shared/ui-assistant/message.ts)), and the
domain data is EUR throughout — the bug was never reachable.

### 1.2 `@copilotkit/core` 1.63.2 → 1.66.0

This is where the substance is.

**A. Tool-result insertion order for parallel tool calls — high relevance**

`executeSpecificTool` / `executeWildcardTool` used to splice every tool result
at `messageIndex + 1`, i.e. directly after the assistant message. With _n_
parallel tool calls in one assistant message the results ended up in **reverse
order**. 1.66.0 skips past already-inserted `tool` messages:

```js
let insertAt = messageIndex + 1;
while (
  insertAt < agent.messages.length &&
  agent.messages[insertAt]?.role === 'tool'
)
  insertAt++;
```

Every agent prompt in this repo explicitly demands parallel widget calls in a
single assistant message —
[ticketing](../ai-server/src/mastra/agents/ticketing-agent.prompt.ts),
[travel-planner](../ai-server/src/mastra/agents/travel-planner-agent.prompt.ts),
[travel-refinement](../ai-server/src/mastra/agents/travel-refinement-agent.prompt.ts),
[planning](../ai-server/src/mastra/agents/planning-agent.prompt.ts) — and the
widgets are `followUp: false`, so the mis-ordered results stay in
`agent.messages` and are replayed to the server on the next turn. Free fix.

**B. Placeholder tool results are now replaced — low relevance**

If a `tool` message with the content `"Forwarded to client"` already exists for
a tool call and a frontend handler is registered, the placeholder is now removed
from both `newMessages` and `agent.messages` and the frontend tool is executed.
That placeholder is emitted by the CopilotKit runtime; this repo talks to Mastra
over AG-UI directly, so it does not occur. Note the neighbouring helper
`normalizeToolResultContent` now also handles array/object `content` shapes.

**C. Runaway follow-up guard — low relevance, nice safety net**

`MAX_FOLLOW_UP_DEPTH = 100`. Recursive follow-up runs stop with a
`logger.warn` instead of looping forever.

**D. Abort no longer surfaces a run error — medium relevance**

```js
onRunErrorEvent: async ({ event }) => {
  if (this._runAbortController?.signal.aborted === true || event?.code === 'abort') return;
  …
}
```

`stop()` / `reset()` in
[agent-store-helper.ts](../src/app/domains/shared/util-copilotkit/agent-store-helper.ts)
call `agent.abortRun()`; the resulting error event is now swallowed instead of
being reported as an agent failure.

**E. `setToolEnabled(name, enabled, agentId?)` / `isToolEnabled(…)` — new API**

Runtime enable/disable of a registered frontend tool without unregistering it.
Disabled tools are filtered out in `buildFrontendTools`, so the agent never
sees them on the next run. The override is keyed by `agentId\0name` and
survives re-registration — unlike the per-tool `available` flag.

**F. A2UI catalog registry — new API**

`CopilotKitCore.setCatalogComponents(components)`,
`setCatalogComponentEnabled(name, enabled)`, `isCatalogComponentEnabled(name)`,
plus the subscriber hook `onCatalogComponentsChanged`. Backing type:
`CopilotKitCoreCatalogComponent { name, description?, schema }`. Purpose is the
CopilotKit Inspector's "Capabilities" panel.

**G. Memory store — not applicable**

`ɵMemoryStore.recall(query, { limit, scope })` (hybrid RAG via
`POST {runtimeUrl}/memories/recall`, results carry a `score`), project-scoped
memories are no longer filtered out of the snapshot, and a second
`project_meta:memories:<code>` Phoenix channel is joined when project
credentials exist. All of this needs a CopilotKit Cloud `runtimeUrl`. This repo
has none — `useServerMemory` is our own thing in
[app-http-agent.ts](../src/app/domains/shared/util-copilotkit/app-http-agent.ts).

**H. `ProxiedCopilotRuntimeAgent.requestInit()` — not applicable**

Now merges `credentials` into the request init. We register `selfManagedAgents`
with our own `AppHttpAgent extends HttpAgent` (from `@ag-ui/client`) and already
override `requestInit` there; the proxied runtime agent is unused.

### 1.3 The other three packages

- `@copilotkit/shared` 1.63.2 → 1.66.0: `dist/index.d.mts` byte-identical.
- `@copilotkit/web-components`: only the version in `package.json` changed.
- `@copilotkit/a2ui-renderer`: adds `filterCatalog` — a **React-only** helper
  under `dist/react-renderer/`, the counterpart to (F).

### 1.4 What 0.3.1 does _not_ wire up

`@copilotkit/angular` 0.3.1 contains zero references to `setCatalogComponents`,
`setToolEnabled`, `isToolEnabled`, `onCatalogComponentsChanged` or `recall`.
E and F are reachable only through `copilotKit.core.*`, with no Angular
provider, injectable or signal in front of them.

## 2. Migration steps

1. [package.json](../package.json): `"@copilotkit/angular": "0.3.0"` → `"0.3.1"`.
2. `npm install`.
3. Recreate the manual symlink `node_modules/@internal/ag-ui-server ->
../../libs/ag-ui-server`. It is not declared in `package.json` (only as a
   `paths` entry in [ai-server/tsconfig.json](../ai-server/tsconfig.json)) and
   `npm install` prunes it — the ai-server fails to start without it.
4. `npm run lint`, `npm test`, `npm run test:aimock`.
5. Smoke-test one parallel-widget turn (ticketing: "book flight X" → message +
   flight widget in one assistant message) and one `stop()` mid-run.

No source change is required. A dry-run resolve of `@copilotkit/angular@0.3.1`
against the current lockfile produced no peer conflicts. Caveat: the checked-out
`node_modules` is well behind `package-lock.json` (still carries
`@copilotkit/runtime`, removed during the 0.3.0 migration), so the install will
move ~50 packages that have nothing to do with this bump. Do it as its own
commit.

## 3. What improves for free

Only (A) and (D) touch code paths this app actually exercises, plus (C) as a
safety net. Everything else is either React-side, cloud-side, or opt-in.

## 4. What could now be done better — and what it is worth

**Runtime tool gating via `core.setToolEnabled` (E).** Today every agent store
registers its frontend tools statically
([init-agent-store.ts](../src/app/domains/shared/util-copilotkit/init-agent-store.ts));
turning a capability off means not registering it. With (E) the chat shell's
mode selector could toggle individual widgets/tools at runtime, e.g. an
"expert mode" that unlocks `setTravelPlan`, without re-running
`initAgentStore`. Cost: a thin wrapper around `copilotKit.core.setToolEnabled`,
since there is no Angular-level API. Takes effect on the next run, not the
in-flight one. This is the one genuinely new capability worth considering —
and a good workshop demo, because it shows the core/Angular layering.

**Registering the custom A2UI catalog with core (F).** We currently push the
catalog to the agent as context only
([catalog-context.ts](../src/app/domains/shared/util-copilotkit/a2ui/catalog-context.ts),
[provide-a2ui-catalog.ts](../src/app/domains/shared/util-copilotkit/a2ui/provide-a2ui-catalog.ts)).
`setCatalogComponents` would additionally expose it to the Inspector. But
nothing in the Angular package calls it, and the actual filtering helper
(`filterCatalog`) ships React-only — so toggling a component off would list it
as disabled without changing what
[a2ui-activity-renderer.ts](../src/app/domains/shared/util-copilotkit/a2ui/a2ui-activity-renderer.ts)
renders. **Not worth it yet.** Revisit when the Angular package adopts the API.

**Memory `recall()` (G).** Only meaningful with CopilotKit Cloud. Our
server-side memory is a Mastra concern. Skip.

**Simplification of existing workarounds: none.** Nothing in 0.3.1 lets us
delete code we currently carry.

## 5. Still on us after 0.3.1

- `AppHttpAgent.isInterruptToolResultEcho` — suppressing the server's echoed
  tool result for `human_approval` / `tool_suspended` interrupts.
- `AppHttpAgent.requestInit` history trimming for `useServerMemory`.
- The custom chat shell
  ([chat-messages.ts](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts))
  and `CopilotActivity`, which stays until upstream PR #6033 lands.
- The three `::ng-deep` rules neutralizing `CopilotDefaultToolRenderer`'s card
  chrome (see §1 of [copilotkit-0.3.0-changelog.md](../docs/copilotkit-0.3.0-changelog.md)).

## 6. Outlook

Upstream `@copilotkit/core` is already at 1.68.x, while `@copilotkit/angular`'s
`latest` is 0.3.1 (core 1.66.0); `canary` is 0.3.2-canary (core 1.66.2). The
Angular package lags core by roughly two minors — worth keeping in mind before
building on any core-only API such as (E).

## 7. Recommendation

Do the bump. It is a one-line change plus an install, it fixes a real ordering
bug in the parallel-widget flow the whole training builds on, and it carries no
API risk. Treat (E) as a separate, optional follow-up.
