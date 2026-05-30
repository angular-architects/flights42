# Architecture Decision Records (ADRs)

This directory captures the architectural **decisions** behind this repository:
their context, the alternatives we considered, and their consequences.

## Why ADRs and rules are separate

- **ADRs (this directory)** record _why_ a decision was made. They are written for
  humans, are append-only, and carry a status (`Accepted`, `Superseded`, ...).
- **Rule documents** (`docs/architecture-boundaries.md`, `docs/architecture-state-management.md`) contain the
  short, imperative _what_ that agents and developers must follow on every change.

The rules are **derived** from the ADRs. Each derived rule links back to its ADR via
`(derived from ADR-XXXX)`. This keeps the always-loaded rule context small while the
full rationale stays available on demand.

> Not every rule comes from an ADR. Pure conventions (file naming, locality, comment
> language, ...) live only in the rule documents and have no ADR.

## Index

| ADR                                               | Title                                          | Status   |
| ------------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-use-sheriff-for-domain-boundaries.md) | Use Sheriff to enforce domain boundaries       | Accepted |
| [0002](0002-relaxed-layering.md)                  | Relaxed layering: feature → ui → data → util   | Accepted |
| [0003](0003-ngrx-signal-store-for-state.md)       | NgRx Signal Store for state management         | Accepted |
| [0004](0004-feature-slicing-and-shared-code.md)   | Feature-sliced structure with promote-on-reuse | Accepted |

## Template

Use [`template.md`](template.md) when adding a new ADR. Number ADRs sequentially and
never edit an accepted ADR's decision; instead add a new ADR that supersedes it.
