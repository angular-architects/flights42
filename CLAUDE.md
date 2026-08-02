# flights42 — Training starter kit

This repo is the starter kit for the Angular Architects workshops. The corresponding
lab exercises live in the sibling repo **workshop-site** (`workshops/*/Labs`) — the
rule there: before making changes, read the `_context.md` of the respective Labs
folder.

## Branch chains

- **Mental model:** A starter kit is `main` minus solution content — for the exercise,
  code is typically removed or replaced with TODO comments.
- The ENT branches are based on `main` and updated via `node rebase.js`;
  `ENT-signals-starter` is based on `ENT-signals-solution`. The ess chain
  (`rebase-ess.mjs`) is based on `ess-starter`, not on `main`.
- For chain updates, use the **rebase-labs skill** (`.claude/skills/rebase-labs/`),
  including its conflict rules and verification steps.
- Participants clone from GitHub — local chain changes only take effect after
  `git push --force-with-lease` (only on explicit instruction).

## Iron rules

- **Superset invariant:** All dependencies come from `main`. Chain branches do **not**
  touch `package.json`/`package-lock.json` (the only tolerated exception:
  pure `scripts` lines such as `test:arch` on `ENT-sheriff-starter`). If a lab needs
  a new dependency → add it to `main`, regenerate the lock there, rebase the chain.
- **Lockfile conflicts during rebase:** never take one side — always
  `git checkout --ours package-lock.json` (details in the rebase-labs skill). Stale
  locks break `npm ci` and fresh `npm i` for participants.
- Starter branches leave things out **deliberately** (participants build them
  themselves). Something missing is not a bug and must not be "fixed"; TODO comments
  for participants must be preserved.
- All artifacts (labs, context files, skills, internal notes) are written in
  **English**.

## Deliberate quirks (do not "fix")

- `sheriff.config.api.ts` and `sheriff.config.simple.ts` in the root belong to the
  **book project** (ideas for further exploration) — no lab uses them;
  only `sheriff.config.ts` is active.
- `directives-starter` is an **alias of `comp-starter`** (the Directives lab
  deliberately starts on the Components starter). The branch only exists on GitHub
  and is not part of any rebase chain — when `comp-starter` is updated, move it along
  manually.
- The `DateControl` (`src/app/domains/shared/ui-common/date-control/`) is only used
  on `main`. The forms starter (`ENT-signal-forms-starter`) deliberately uses a plain
  `datetime-local` input on the advanced page and normalizes the date for it in
  `advanced-flight-edit.ts` — keep both places in sync.
- `exit.guard.ts` (`FormComponent`/`exitGuard` in `shared/util-common`) is
  deliberately not registered in any route — the guard is only wired up in certain
  trainer demos. Do not "clean up" the guard or `implements FormComponent`
  occurrences.
- The diff `ENT-signals-starter..ENT-signals-solution` contains, for historical
  reasons, extra changes in five files unrelated to the lab (flight-edit area,
  `eslint.config.js`, `booking-navigation.html`) in addition to the three lab files.
  This is accepted (no coupling to `flight-search`, labs do not reference the
  branch); for demo diffs, restrict the comparison to the lab files.

## Code conventions

- Since the ng22.1 chain, `@Service()` (from `@angular/core`) is the preferred
  decorator for services — no longer `@Injectable()`. Lab snippets for branches of
  the current chain follow this. Older chains and states (`comp-starter`/Directives,
  ess chain, `ag-ui-starter`/`agentic`) still run on Angular 21 and correctly keep
  using `@Injectable()` there — do not "modernize" them.
