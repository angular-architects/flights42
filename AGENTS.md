# Agent Instructions

## Code Style

- Always use braces for blocks, even when the block contains only one
  statement.
- NEVER add code comments.
- When deriving TypeScript types from Zod schemas, define the named type next to
  the schema. Do not use `z.infer<typeof schema>` ad hoc in renderer, tool, or
  component signatures.
- Do not use as in @if like here
  @if (activeInterrupt(); as interrupt) { ... }

## Verification

- At the end of every run that changes TypeScript files, run the project linter
  with `--fix` so imports are sorted.
