---
name: code-quality-review
description: Review changed TypeScript code against the code quality rules in AGENTS.md — Single Level of Abstraction (SLAP), helper functions as nameable domain concepts, and the hard nesting limit of 2. Use when the user asks for a code quality review, or to review a branch or ticket implementation before merging.
---

# Review Code Quality

Use this skill when reviewing code for structural quality.

Before reviewing, read:

- the `## Code Quality` section of `AGENTS.md` — the source of truth
- the changed files (for a branch: `git diff <base>...<branch>`)
- the `context.md` of the affected domain and feature, to know its language

Do not invent additional rules. Review only the three rules below, and only
the changed code.

## Process

1. List the functions and methods the change adds or modifies.
2. **SLAP**: for each function, decide whether it orchestrates (calls
   well-named steps) or implements one concrete mechanic. Report every
   function that does both, naming the lines that belong to the other level.
3. **Helper names**: for each new helper, check that its name is a concept
   from the domain language (`context.md`, models, ticket). Report generic or
   mechanical names (`processData`, `handleItems`, `helper`, `doStuff`) and
   helpers that exist only to shorten code without a meaning of their own.
4. **Nesting**: report every block nested deeper than two levels inside a
   function. Run `npx ng lint flights` to confirm; ESLint `max-depth` enforces
   the limit. Also report nesting that only stays within the limit through
   hard-to-read tricks (long `&&` chains, nested ternaries).
5. Recommend the smallest fix for each finding: extract a named step, split
   orchestration from mechanics, rename after the domain concept, or return
   early.

## Output

Provide:

- summary
- findings by rule (SLAP, helper names, nesting), each with file, line and
  concrete fix
- functions that were checked and are fine, as one short list
