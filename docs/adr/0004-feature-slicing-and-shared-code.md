# ADR-0004: Feature-sliced structure with promote-on-reuse

- Status: Accepted
- Date: 2026-05-30

## Context

Code needs a clear home. The central question is _where code lives and when it is
allowed to move_ to a lower layer or into the shared area. If sharing is too eager, the
shared area becomes a dumping ground of premature abstractions; if it is too reluctant,
features duplicate logic. We want a rule that keeps code close to its single user and
promotes it only when reuse is real.

## Decision

We organize code by feature and promote it on demonstrated reuse:

- Code used by a single feature lives in that feature's folder.
- Code reused by another feature in the **same domain** moves down to a lower layer.
- Technical code reused by a feature in a **different domain** moves down to a lower
  layer of the shared area. For domain-specific code, the user is consulted first.
- Code is promoted to the shared area only when **at least two independent features**
  require it; premature shared abstractions are avoided.

## Alternatives considered

- **Shared-by-default** — put potentially reusable code in shared up front. Rejected:
  leads to premature abstraction and a bloated shared area.
- **Duplicate instead of share** — never promote, accept duplication. Rejected: causes
  drift between copies and inconsistent behavior.
- **Promote on first reuse (two copies)** — promote as soon as a second user appears,
  with no "two independent features" guard. Rejected as too eager; the threshold of two
  _independent_ features is a better signal of genuine reuse.

## Consequences

- Positive: code stays close to its owner; the shared area only holds proven reuse.
- Positive: promotion direction is predictable and composes with layering (ADR-0002)
  and Sheriff boundaries (ADR-0001).
- Negative / trade-offs: a short-lived duplication may exist before the second
  independent user justifies promotion; promotion requires a deliberate refactor.

## Derived rules

- `docs/architecture-boundaries.md` → Feature Slicing: placement and promote-down rules.
- `docs/architecture-boundaries.md` → Shared Code: "Promote … only when at least two independent
  features require it" and "Avoid premature shared abstractions."
