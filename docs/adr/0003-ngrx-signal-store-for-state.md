# ADR-0003: NgRx Signal Store for state management

- Status: Accepted
- Date: 2026-05-30

## Context

We need a consistent approach to managing state. The app is signal-based, and we want
stores that are colocated with the features that own them, with a clear separation
between state management and data access.

## Decision

We use the **NgRx Signal Store** for state management. Stores live at the feature level
by default and are built with the NgRx Toolkit features `withResource`, `withMutations`
(when needed), and `withDevtools`. Data access is never performed inside a store; it is
delegated to a stateless data access service. `FlightStore` is the reference
implementation.

## Alternatives considered

- **Classic NgRx Store (actions/reducers/effects)** — powerful but heavyweight for this
  app; more boilerplate than a signal-first model warrants.
- **Plain services holding signals** — fine for trivial state, but lacks the structure,
  conventions, and devtools we want as state grows.

## Consequences

- Positive: signal-native, low boilerplate, devtools support, clear store conventions.
- Positive: stores stay focused (one entity _or_ one piece of UI state).
- Negative / trade-offs: relies on `@angular-architects/ngrx-toolkit`; contributors must
  learn its store features.

## Derived rules

- `docs/architecture-state-management.md` → "Place new Signal Stores at the feature level whenever possible."
- `docs/architecture-state-management.md` → "Each store should manage either a single entity _or_ a piece
  of UI state — never both."
- `docs/architecture-state-management.md` → "Never perform data access directly within a store; delegate
  it to a data access service instead."
- `docs/architecture-state-management.md` → "Use `withResource`, `withMutations` (if needed),
  `withDevtools`; follow `FlightStore`."
