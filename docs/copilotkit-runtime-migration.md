# CopilotKit server runtime (deferred migration)

Status: assessed 2026-09-12, **deferred** until upstream PR
[#2691](https://github.com/ag-ui-protocol/ag-ui/pull/2691) (fixes issue
#2667) is released. Nothing in the repo has been changed for this yet.
Precondition executed the same day: plan and execution mode are two client
stores (`planning-agent-store.ts`, `ticketing-agent-store.ts`), each with
its own `HttpAgent` and thread; the server route no longer switches agents
via `forwardedProps.agentMode`. That removed the last route-only reason
listed under "What stays as is" in
[stock-adapter-migration.md](stock-adapter-migration.md).

Attempt 2026-09-12 (rolled back at the user's request before the smoke
test; everything below still applies): `npm install @copilotkit/runtime@1.70.1`
only resolves with `legacy-peer-deps=true` in `.npmrc` — the optional
LangChain peers pull `openai@4` and `@browserbasehq/stagehand`, and an
`openai` override alone does not help. The install adds 221 packages; all
`@ag-ui/*` packages dedupe to the root versions except one nested
`@ag-ui/client@0.0.54` under the runtime's `@ag-ui/langgraph`. The subclass
and a handler built as sketched below (`CopilotRuntime` +
`createCopilotRuntimeHandler({ runtime, basePath: '/copilotkit' })`, mounted
via `registerApiRoute('/copilotkit/*', { method: 'ALL', handler: (c) =>
handler(c.req.raw) })`) type-check against 1.70.1 and `@mastra/core` 1.63.
Rollback = `git checkout` of `package.json`, `package-lock.json`, `.npmrc`
and the stub, then `npm install`.

Verified against: `@copilotkit/runtime` 1.70.1 source
(`~/projects/public/CopilotKit`, commit `c6c20da9fa`, 2026-09-07),
`@ag-ui/mastra` 1.1.2 (installed) and 1.1.3 (tarball), `@ag-ui/client`
0.0.59.

## Goal

Replace the hand-written Hono route (`ai-server/src/mastra/routes/`) with
`CopilotRuntime` from `@copilotkit/runtime/v2`, which publishes every
registered agent at `POST <basePath>/agent/<agentId>/run` as raw AG-UI SSE
and exposes agent discovery via `GET /info`. The client keeps its
`selfManagedAgents` `HttpAgent`s and client middlewares; only the URL
changes (`ConfigService.agUiUrlFor`).

## Reasons that no longer apply

- **`agentMode` switch** — gone with the two-store split.
- **Per-agent MCP scoping** — `mcpApps.servers[].agentId` binds a server to
  one agent; `a2ui.agents` plus `injectA2UITool: false` scopes A2UI
  (matches our variant B with the own `renderA2uiTool`). Both middlewares
  are attached per request _after_ the runtime clones the agent
  (`handlers/shared/agent-utils.ts`, `configureAgentForRequest`).
- **Mastra `RequestContext`** — nothing needs it. The adapter sets the
  `ag-ui` key on its own request context; `index.ts` configures no Mastra
  server middleware.
- **Runner thread store** — `handle-run.ts` sets `agent.setMessages` /
  `setState` from the request body; the `InMemoryAgentRunner` only snapshots
  for its `/threads/*` endpoints. Client sent-filter + Mastra memory dedup
  work unchanged.
- **License** — the license checker only feeds the status in `/info`; no
  gating in the run path. Telemetry is env-opt-out.

## What still has to be solved

1. **Resume drops `clientTools`, `toolsets`, `untilIdle`** (issue #2667).
   Our route works around it with `resumingAgent` + stripping `resume` from
   the input (`route-utils.ts`). The runtime has no hook for this: hooks are
   request-level, the agents factory sees only the raw `Request`.
   Fix in flight: PR #2691 (NathanTarbert, 2026-09-08, CI green, review
   required, "Fixes #2667"). `@ag-ui/mastra` 1.1.3 (2026-09-08) does **not**
   contain it (resume options still `toolCallId`, `runId`, `memory`,
   `requestContext`). Preview build:
   `npm i https://pkg.pr.new/ag-ui-protocol/ag-ui/@ag-ui/mastra@2691`.
2. **`ensureThread` before the run** — needed while our PRs #2662 (no warn
   on recall failure) and #2663 (thread-scoped working memory seeded on
   first turn) are open.
3. **`MastraAgent.clone()`** is `new MastraAgent(this.config)` plus headers.
   It neither preserves a subclass nor `use()`-attached middlewares, and
   `config` is `private`. A subclass must keep its own config copy and
   override `clone()`.
4. **Dashboard route** (`dashboard-ag-ui-route.ts`): cache short-circuit
   before the run, `onEvent` interception at `TOOL_CALL_END`
   (compile spec, emit `ACTIVITY_SNAPSHOT` + data-step events),
   `preventCaching` forwarded prop, dev frame delay. No runtime hook. Either
   keep it as a Mastra route (then `ag-ui-stream.ts` stays for it alone) or
   rebuild it as an AG-UI middleware on a clone-safe subclass that answers
   cache hits itself and rewrites `next.run()` events.
5. **Dependencies** — 48 direct deps (graphql-yoga + defer-stream plugin,
   a second `hono`, all `@ai-sdk/*` providers, `@copilotkit/license-verifier`,
   `zod ^3` nested) and nine optional LangChain peers that ERESOLVE against
   root zod 4. Today the package is aliased to the empty
   `libs/copilotkit-runtime-stub`; a real install needs `legacy-peer-deps`
   or targeted overrides. The runtime comes _in addition to_ `@ag-ui/mastra`.
6. **Hosting** — mount the fetch handler inside Mastra's Hono
   (`registerApiRoute('/copilotkit/*', …)` returning
   `handler(c.req.raw)`) or run it on its own port.

## The subclass

Kept small on purpose; the helpers move unchanged from `route-utils.ts`.
`run()` is public on `MastraAgent` and reads `this.agent` per call, so the
resume proxy can be swapped in per run. `withoutMemoryArgs` is applied to
the Mastra agent at registration and survives the clone via the config.

```ts
export class ResumableMastraAgent extends MastraAgent {
  constructor(private readonly ownConfig: MastraAgentConfig) {
    super(ownConfig);
  }

  override run(input: RunAgentInput): Observable<BaseEvent> {
    const base = this.ownConfig.agent as Agent;
    const command = resolveResumeCommand(input);
    this.agent = command ? resumingAgent(base, command) : base;
    const runInput = command ? { ...input, resume: undefined } : input;
    return from(ensureThread(base, input.threadId)).pipe(
      switchMap(() => super.run(runInput)),
    );
  }

  override clone(): ResumableMastraAgent {
    return new ResumableMastraAgent(this.ownConfig);
  }
}
```

| Part                                                                        | Lines |
| --------------------------------------------------------------------------- | ----- |
| Subclass, new                                                               | ~25   |
| `resolveResumeCommand`, `withStream`, `resumingAgent`, `ensureThread` moved | 53    |
| Runtime registration in `index.ts` (agents map, `a2ui`, `mcpApps`)          | ~15   |
| Removed: `ag-ui-route.ts`, `middlewaresFor`, `toAgUiAgent`                  | ~100  |
| `ag-ui-stream.ts` — only if the dashboard route moves too                   | 129   |

After #2691 is released the resume part disappears (~12 lines left). After
#2662/#2663 the subclass is unnecessary.

## Steps when resuming

1. Check merge and release state of #2691, #2662, #2663; drop the matching
   parts of the subclass.
2. Remove the `@copilotkit/runtime` stub override; decide on
   `legacy-peer-deps` vs overrides (see the 2026-08-02 notes in the
   `copilotkit-demo` project: `overrides.openai=^6`).
3. Add `ResumableMastraAgent` (or the reduced variant) next to the agents.
4. `index.ts`: `new CopilotRuntime({ agents, a2ui: { agents:
['ticketingAgent'], injectA2UITool: false }, mcpApps: { servers:
[{ ...HOTELS_MCP_SERVER, agentId: 'ticketingAgent' }] } })`; `untilIdle`
   from `agUiRouteConfig` into each agent's config; mount the handler.
5. Client: `agUiUrlFor(id)` → `<base>/agent/<id>/run`; client middlewares
   (`SentFilterMiddleware`, `developerMessagesAsUser`,
   `ResumedToolCallMiddleware`) stay as they are.
6. Decide the dashboard route (keep vs middleware).
7. Smoke: book/cancel card approval → `messageWidget` follows; plan handoff
   plan → execution; MCP hotels; A2UI form round trip; travel refinement
   `untilIdle`.
8. Delete `ag-ui-route.ts`, `middlewaresFor`, `toAgUiAgent`; `ag-ui-stream.ts`
   only if step 6 moved the dashboard. Update
   [stock-adapter-migration.md](stock-adapter-migration.md) §7.
