# Signal Store

## Location of Stores

- Place new Signal Stores at the feature level whenever possible.
- If a store is needed by additional features, move it down to a lower level.
- If a store is needed across different domains, consult the user before moving it to the shared area.

## Granularity of Stores

- Each store should manage either a single entity _or_ a piece of UI state — never both.
  - Exception: lookup data (e.g., values for dropdowns) may be bundled. Combine such
    resources in one store per feature, named `<Feature>LookupStore`.
- Create separate stores for searching entities and for the detail/edit view.
- Never perform data access directly within a store; delegate it to a data access service instead.

## Store Dependencies

- A store accesses another store only in exceptional cases. Ask the user before
  introducing a store-to-store dependency.

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
- Components obtain data only from a store or from a service that orchestrates several
  stores — never directly from a data access service.
