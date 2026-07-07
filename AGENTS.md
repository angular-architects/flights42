# Agent Instructions

## Code Style

- Always use braces for blocks, even when the block contains only one
  statement.
- Do not add comments unless something non-obvious is happening, for example a
  workaround, a deliberate limitation, or a temporary solution.
- When deriving TypeScript types from Zod schemas, define the named type next to
  the schema. Do not use `z.infer<typeof schema>` ad hoc in renderer, tool, or
  component signatures.

## Verification

- At the end of every run that changes TypeScript files, run the project linter
  with `--fix` so imports are sorted.
