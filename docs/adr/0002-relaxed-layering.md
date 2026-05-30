# ADR-0002: Relaxed layering (feature → ui → data → util)

- Status: Accepted
- Date: 2026-05-30

## Context

We need a predictable import direction between the layers `feature`, `ui`, `data`, and
`util`. Strict layering (each layer may only import the layer directly below it) is one
option, but it tends to force artificial pass-through code when, for example, a feature
legitimately needs a utility.

## Decision

We apply **relaxed layering**: a layer may import from any lower layer, with the single
permitted direction `feature → ui → data → util`. Imports against this direction are not
allowed.

## Alternatives considered

- **Strict layering** — only the immediately lower layer may be imported. Cleaner in
  theory, but produces boilerplate re-exports and indirection for common cases.
- **No layering** — maximum flexibility, but no protection against cyclic or upward
  dependencies.

## Consequences

- Positive: avoids pass-through boilerplate while still preventing upward/cyclic deps.
- Positive: easy to reason about and to enforce together with Sheriff (see ADR-0001).
- Negative / trade-offs: a feature can depend on several lower layers at once, so layer
  responsibilities must stay well defined.

## Derived rules

- `docs/architecture-boundaries.md` → "Apply relaxed layering."
- `docs/architecture-boundaries.md` → "Permit only the following import direction:
  `feature → ui → data → util`."
