---
name: rebase-labs
description: Rebases the training branch chains (rebase.js for ENT branches onto FULL, rebase-ess.mjs for the ess lab chain) and resolves conflicts according to the repo rules. Use when the chains need to be updated after changes to base branches.
---

# Context

Training repo. The branch chains are defined in the scripts themselves (tasks array
in `rebase.js` and `rebase-ess.mjs`). Each starter branch is the solution of the
previous lab; upstream changes propagate downstream through the whole chain via
rebase.

Two iron rules:

- Starter branches leave things out **deliberately** (not needed in the lab or built
  by the participants themselves). Something missing is not a bug and must not be
  "repaired" while resolving.
- TODO comments for participants must be preserved.

# Procedure

1. The working tree must be clean. Common disruptor: the Peacock extension writes to
   `.vscode/settings.json` on branch switches → discard with
   `git checkout -- .vscode/settings.json`.
2. Run `node rebase.js`. The script aborts at the first conflict.
3. Resolve the conflict (see below), then `git add <files>` and
   `GIT_EDITOR=true git rebase --continue`. Within a single branch rebase, several
   conflicts can occur in sequence — resolve each and continue.
4. After the rebase completes: back to main, run the script again. Branches already
   rebased pass through as a no-op. Repeat until `🎉 Fertig` without conflicts.
5. Do the same with `node rebase-ess.mjs`.
6. Verification (see below).

# Conflict resolution

Decision logic per conflict:

- **Replay of an old, already contained commit:** As soon as a commit has been
  rewritten once with a conflict resolution, its patch-id no longer matches and it
  is replayed on every subsequent branch of the chain. Recognizable by the new base
  (HEAD) already containing the content in a **newer** form. → take HEAD:
  `git checkout --ours <files>`.
- **Genuinely new material** (the commit belongs to this branch content-wise, e.g.
  the lab solution of the preceding lab): take the incoming side
  (`git checkout --theirs`) or combine both sides if HEAD additionally contains new
  upstream changes (e.g. a new import on both sides → keep both).
- **EXCEPTION `package-lock.json`:** The two rules above do NOT apply to the
  lockfile — never take one side (not even for "genuinely new material"; that is
  exactly how stale locks arise, which break `npm ci` and fresh `npm i`). Instead,
  always: `git checkout --ours package-lock.json`. Only if the branch really has its
  own dependencies in package.json, run `npm i` afterwards (regenerates the branch
  extras on the new base) — the target state, however, is that dependencies come
  exclusively from `main` (superset invariant) and chain branches do not touch
  package.json/lock at all. If rerere has recorded a resolution for the lockfile,
  discard it (`git rerere forget package-lock.json`).
- **When in doubt, look up the target state:** The branch state before the rebase
  shows what the content should end up as:
  `ORIG=$(tr -d '[:space:]' < .git/rebase-merge/orig-head); git show "$ORIG:<path>"`.
  Additionally look at the tips of the downstream branches. Caution: new upstream
  commits (e.g. starter simplifications like "prepare starter kit") are meant to
  change the old state deliberately — their effect belongs in the result.
- **rerere:** From the second run onward, git-rerere resolves recurring conflicts
  itself ("resolved with previous conflict resolution"). Then only check that no
  markers remain in the files (`grep -rl '<<<<<<<'`), `git add -u`, continue.
- Trivial conflicts (e.g. only a missing newline at the end of a file): take the
  side with the newline.

# Verification

- Chain: `git merge-base --is-ancestor <base> <branch>` must return 0 for each pair.
- Content: `git diff "<branch>@{1}" <branch> --stat` — only intended upstream
  propagations may appear; ideally, branches without new upstream changes are
  tree-identical (empty diff).
- TODOs: compare counters before/after, must be identical:
  `git grep -c TODO "<branch>@{1}" -- 'src/**'` vs. `git grep -c TODO "<branch>" -- 'src/**'`.
- Do not push — the branches diverge from origin after the rebase.
  `git push --force-with-lease` only on explicit instruction.
