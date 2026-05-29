# Signal Store

## Location of Stores

- Place new Signal Stores at the feature level whenever possible.
- If a store is needed by additional features, move it down to a lower level.
- If a store is needed across different domains, consult the user before moving it to the shared area.

## Granularity of Stores

- Each store should manage either a single entity _or_ a piece of UI state — never both.
- Create separate stores for searching entities and for the detail/edit view.
- Never perform data access directly within a store; delegate it to a data access service instead.

## Structure of Stores

- Use the following features from the NgRx Toolkit:
  - `withResource`
  - `withMutations` (if needed)
  - `withDevtools`
- Follow `FlightStore` as the reference implementation.

## Smart and Dumb Components and Stores

- Only smart components are permitted to use stores.
- Smart components use the following suffixes: `Page`, `Search`, `Detail`, `Edit`
  (e.g., `FlightSearch`, `FlightEdit`).
