---
name: verify-and-fix
description: Runs the full local quality checks (ng lint incl. Sheriff boundaries, tsarch architecture rules, browser unit tests, production build) and fixes any problems found. Use when the user asks to verify, run the full checks, run the full ci-checks, or make the work merge-ready, typically after several changes have been made.
disable-model-invocation: true
---

# Full Verify and Fix

Run the full quality checks and resolve every problem until they pass. The stop
hook only runs the fast checks, so this skill is the on-demand full pass before
committing or pushing.

## Run

```bash
npm run verify
```

It stops at the first failing step.

## Fix loop

1. Run `npm run verify`.
2. On failure, diagnose the **root cause**, not the symptom. Never weaken lint,
   Sheriff, or the architecture rules to make a check pass — fix the code
   instead. The rules live in `docs/architecture-boundaries.md` and
   `docs/architecture-state-management.md`.
3. **Propose the fixes first.** Summarize each problem and the change you intend
   to make, then wait for the user's confirmation. Do **not** edit any files
   until the user approves.
4. After the user confirms, apply the approved fixes.
5. Re-run `npm run verify`. If new problems appear, go back to step 2 (propose,
   confirm, then apply) and repeat until every step passes.
6. Report success only once `npm run verify` is fully green.

## Notes

- Do not edit the generated `.claude/skills/` copy; this skill lives in
  `.agents/skills/`.
