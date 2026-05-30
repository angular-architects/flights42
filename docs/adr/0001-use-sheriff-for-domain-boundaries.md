# ADR-0001: Use Sheriff to enforce domain boundaries

- Status: Accepted
- Date: 2026-05-30

## Context

The application is organized into features and domains. Without automated checks,
modules tend to reach into the private internals of other features over time, which
erodes boundaries and makes the codebase hard to change. We want boundaries that are
verifiable in CI and in the editor, not just documented.

## Decision

We use [Sheriff](https://github.com/softarc-consulting/sheriff) to define and enforce
module boundaries. Cross-domain communication happens exclusively through the public
APIs configured in Sheriff or through dedicated parts of the shared area.

## Alternatives considered

- **No automated enforcement (documentation only)** — relies on discipline and review;
  boundaries drift in practice.
- **ESLint `no-restricted-imports`** — possible, but verbose and hard to keep in sync
  with a feature/domain model; weaker domain semantics than Sheriff.
- **Nx module boundary rules** — viable, but Sheriff is already adopted here and maps
  directly onto our tagging model.

## Consequences

- Positive: boundary violations fail fast (CI + editor); refactors are safer.
- Positive: the public API of each module is explicit.
- Negative / trade-offs: an extra config to maintain; new features must be tagged
  correctly to be checked.

## Derived rules

- `docs/architecture-boundaries.md` → "Respect the existing domain boundaries enforced by Sheriff."
- `docs/architecture-boundaries.md` → "Cross-domain communication must occur exclusively through
  the public APIs configured in Sheriff or through dedicated parts of the shared area."
- `docs/architecture-boundaries.md` → "Modify the Sheriff configuration only when explicitly
  instructed; never to relax existing boundaries."
