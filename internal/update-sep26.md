# Update September 2026 — what changed and why

Internal notes on the update of 2026-09-16 (branch `ENT-AI-Simplified`). The
resulting setup is documented in `docs/ai-setup.md`; this file records the
decisions, the reasons and the things that went wrong on the way. Source of
the requirements: `specs/001-update-sep-2026.md`.

## 1. Angular 22

**What.** `ng update @angular/cli @angular/core @angular/material angular-eslint @angular-architects/native-federation`
to Angular 22.1.6 / CLI 22.1.8, TypeScript 6.0.3. Everything else via
`npm-check-updates`: NgRx Signals 22, ngrx-toolkit 22, ngx-markdown 22,
Hashbrown 0.5, vitest 4.1, angular-eslint 22.5, typescript-eslint 8.70.

**Stumbling blocks.**

- **Change detection.** Angular 22 renames `Default` to `Eager`, and the
  migration writes `changeDetection: ChangeDetectionStrategy.Eager` into
  every component that had no explicit strategy (31 files here). The
  recommended config of angular-eslint 22 then fails on each of them: its
  message calls OnPush "the default" and treats `Eager` as an opt-out. All 31
  components were signal- or input-driven, so they were switched to OnPush.
  Only `AssistantChat` needed a real change: a plain `chat` field set from a
  subscription became a `chatRef` signal, otherwise the first render after
  the chat arrives would have been skipped under OnPush.
- **Hashbrown 0.5** declares Angular 20/21 as peers only. It runs fine on 22;
  `package.json` carries an `overrides` block that re-points its
  `@angular/core` / `@angular/common` peers. Remove it once Hashbrown ships
  an Angular 22 peer.
- **ESLint stays on 9.** `@softarc/eslint-plugin-sheriff` 0.19 has no
  ESLint 10 peer; angular-eslint and typescript-eslint would accept 10.
- **Native Federation 22** no longer depends on
  `@softarc/native-federation-runtime`. `loadRemoteModule` is imported from
  `@angular-architects/native-federation` now.
- **vitest.** `@angular/build` 22.1 pins vitest to `^4.0.8`;
  `@vitest/browser-playwright` needs the exact vitest version. A stale
  lockfile kept vitest 4.0.18 and blocked the bump; deleting the lockfile and
  re-resolving fixed it. Playwright 1.63 needed a new Chromium download.
- The initial bundle exceeds the 500 kB warning budget (724 kB). This is a
  warning, not an error, and predates the update.

## 2. tsarch → ArchUnitTS

**Why.** Lukas Niessen's mail: tsarch is unmaintained (last release
2024-12, TypeScript 3.9 vendored, no `extends` resolution, silent green on
empty selectors). ArchUnitTS 2.5.4 (`archunit` on npm, last release
2026-09-13) is maintained and claims to fix all four points.

**What.** The four suffix rules in `arch/access-rules.spec.ts` are
semantically unchanged. API mapping:

| tsarch                                              | ArchUnitTS                                               |
| --------------------------------------------------- | -------------------------------------------------------- |
| `filesOfProject(tsconfig).matchingPattern(regex)`   | `projectFiles(tsconfig).inPath(glob, { except: [...] })` |
| negative-lookahead regex to express "all except"    | `except` option with regexes                             |
| `.dependOnFiles().matchingPattern(regex)`           | `.dependOnFiles().withName(regex)`                       |
| `await rule.check()` → violations with `dependency` | same shape (`sourceLabel`, `targetLabel`)                |
| no empty-selector protection                        | `EmptyTestViolation` unless `allowEmptyTests: true`      |

**Findings.**

- **Faster.** Test time dropped from 2.8 s to about 1.0 s for the same four
  rules on 138 files (whole vitest run 3.2 s → 1.4 s).
- **tsconfig inheritance works.** `tsconfig.arch.json` now has three lines:
  `extends` the root config plus `include`/`exclude`. Passing
  `tsconfig.app.json` directly would also work; it only adds the three files
  under `src/app/testing`. The separate config is kept purely for scope.
- **Empty patterns fail.** A rule whose selector matches nothing produces one
  violation with the message "No files found matching pattern(s)". Verified
  with a non-existent folder.
- **Quirk: self-edges.** ArchUnitTS records an edge from every file to
  itself (138 self-edges, empty `importKinds`). A rule whose subject and
  object patterns overlap — "stores must not depend on stores", or "all
  non-stores must not depend on clients" where a client is itself a
  non-store — reports every such file as depending on itself. `arch/utils.ts`
  filters self-dependencies in `violationsOf()`. Because of this filter the
  built-in `toPassAsync()` matcher is not used; the tests format violations
  as `source -> target` themselves. Worth reporting upstream.
- The locality exception (a dumb component may use a co-located store) is
  still expressed by filtering violations; neither library can express
  "unless in the same folder" in the fluent API.

## 3. Agent setup simplified

**Instruction file.** `AGENTS.md` only; `CLAUDE.md` contains `@AGENTS.md`.
Codex and Antigravity read `AGENTS.md` directly.

**Skills.** `.agents/skills/` is the only source. Codex and Antigravity read
that folder natively, so the sync script (`scripts/sync-agent-config.mjs`)
has one job left: mirror it to `.claude/skills/` for Claude Code. The
previous MCP sync, `.agents/mcp.json` and the DO_NOT_EDIT markers for MCP are
gone.

**Hooks: two adapters instead of one per tool.**

- Claude Code and Codex converged on the same hook protocol: identical
  `hooks.json` schema (`hooks → Stop → hooks[] → { type, command, timeout }`),
  identical Stop input (`stop_hook_active`, `session_id`, `cwd`), identical
  semantics (exit 2 + stderr blocks the stop and feeds the text back). One
  adapter, `scripts/hooks/stop-hook.mjs`, configured in
  `.claude/settings.json` and `.codex/hooks.json`.
- Google Antigravity reads `.agents/hooks.json` (top-level keys are hook
  names, `Stop` holds the handler list directly) and expects a JSON decision
  on stdout: `{ "decision": "continue", "reason": "..." }` re-enters the loop
  and injects `reason` as a system message. Second adapter:
  `scripts/hooks/antigravity-stop-hook.mjs`. It skips the checks when the run
  ended with an error and `chdir`s into `workspacePaths[0]`.
- Both adapters delegate to the unchanged `scripts/run-checks.mjs`. Both were
  exercised manually against a red lint; the Antigravity format comes from
  the docs, not from a live IDE run.
- Cursor was dropped: no adapter, no `.cursor/` folder. Cursor reads
  `AGENTS.md` on its own if someone still uses it.

**MCP per tool, not synced.** `.mcp.json` (Claude Code), `.codex/config.toml`
(Codex; syntax verified with `codex mcp add`, honoured only for trusted
projects), Antigravity only in the IDE's global MCP settings.

## 4. Context engineering per domain

**Model.** Matt Pocock's `CONTEXT.md`: a glossary of the ubiquitous language,
"totally devoid of implementation details", updated inline the moment a term
crystallizes; ADRs and specs live elsewhere. His `writing-for-agents` adds:
pointers decide when material is loaded, keep docs short, cache only what is
expensive to rediscover.

**Our variant.** One `context.md` per domain and per feature, with five
sections: purpose, language, boundaries, invariants, gotchas. The gotchas
section is a deliberate deviation from Pocock: intentional oddities
("this store is the event-driven teaching example") are exactly the
expensive-to-rediscover facts an agent needs. `AGENTS.md` makes reading the
domain file, then the feature file, mandatory before changing code there,
and asks to update it in the same change. `docs/context-files.md` holds the
rules and template. Five examples exist: ticketing, feature-booking,
feature-reporting, checkin, luggage.

## 5. Ticket refinement skill

`refine-ticket` (in `.agents/skills/`) follows the grilling idea: check the
ticket against code, context files and architecture rules; ask only what the
repo cannot answer; two to four options per question, recommended one first;
never answer on the user's behalf; write results under `## Decisions` in the
ticket and set `status: ready`. Decisions are declared binding in
`AGENTS.md`. If a question fixed the meaning of a term, the term goes into
the affected `context.md` — that is how the context files grow.

## 6. Sandcastle for AFK runs

**What.** `@ai-hero/sandcastle` 0.12. `npm run tickets`
(`scripts/run-tickets.mts`) picks every ticket with `status: ready` from
`tickets/`, runs Claude Code in a git worktree on `ticket/<slug>` with up to
three iterations, and leaves the branch for review. Prompt template:
`.sandcastle/implement-ticket.md`.

**Sandboxing decision.** Sandcastle's Docker/Podman sandbox is not used
(`noSandbox()`). Instead the runner copies `.sandcastle/claude-settings.json`
into the worktree as `.claude/settings.local.json`, which turns on Claude
Code's own OS sandbox: writes confined to the worktree, network limited to an
allow-list, unsandboxed retries disabled. Inside that boundary the agent runs
with `permissionMode: 'bypassPermissions'` so it never waits for approval.
`node_modules` is symlinked from the host, so `npm run verify` and the Stop
hook work inside the worktree without a second install.

**Limits.** Claude's sandbox restricts writes and network, not reads.
Requires the Claude CLI to be logged in and macOS or Linux with bubblewrap.
Only the no-ticket path was executed; a full model run has not been tried
yet.

## 7. Things to verify manually

- The 31 OnPush conversions in the browser, especially the assistant panel
  and the tabbed-pane demos.
- A real Sandcastle run on the example ticket `001-luggage-total-weight.md`.
- Antigravity's Stop hook in the IDE.
- Codex must trust the project before `.codex/config.toml` and
  `.codex/hooks.json` are loaded.
