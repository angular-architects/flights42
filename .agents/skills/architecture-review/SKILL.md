---
name: review-angular-architecture
description: Review Angular code against the repository architecture rules in docs/architecture.md, including Sheriff boundaries, layering, feature slicing, shared code, and state management conventions.
---

# Review Angular Architecture

Use this skill when reviewing Angular code for architectural quality.

Before reviewing, read:

- `docs/architecture.md`
- `AGENTS.md` if present
- `docs/signal-store.md` if state management is involved
- the relevant Sheriff configuration
- the changed files and their imports

Treat `docs/architecture.md` as the source of truth.

Do not invent additional rules. If something is not covered by `docs/architecture.md`, infer cautiously from existing code and mark it as an inference.

## Process

1. Identify the affected feature, domain, and layer.
2. Check the changed files and their imports.
3. Compare the change against `docs/architecture.md`.
4. Check whether Sheriff boundaries are respected.
5. Check whether code is placed in the right feature, layer, or shared area.
6. If state management is involved, also apply `docs/signal-store.md`.
7. Report only concrete findings and recommend the smallest useful fix.

## Output

Provide:

- summary
- findings by severity
- affected files
- violated rule from `docs/architecture.md`
- concrete fix
- checks that should be run
