# Signal Store

## Location of Stores

- Place new Signal Stores at the feature level whenever possible.
- If a store is needed by additional features, move it down to a lower level.
- If a store is needed across different domains, consult the user before moving it to the shared area.

## Granularity of Stores

- A store MUST manage exactly one of the following responsibilities — never a mix:
  1. **Search/list state** of one entity type (the collection, filters, paging).
  2. **Detail/edit state** of a single entity (selected/edited entity, create/update/delete).
  3. **A piece of UI state.**
  4. **Lookup data** (e.g., dropdown values). Bundle these in one store per feature
     named `<Feature>LookupStore`.

- Naming MUST make the responsibility explicit (examples use arbitrary entities from
  arbitrary domains; the rule applies to every entity in every domain):
  - Search/list store: `<Entity>SearchStore` (e.g., `CustomerSearchStore`,
    `InvoiceSearchStore`).
  - Detail/edit store: `<Entity>DetailStore` (e.g., `OrderDetailStore`,
    `EmployeeDetailStore`).
  - These map 1:1 to the smart-component suffixes `Search` and `Detail`/`Edit`.

- A "manage" / CRUD feature is NOT one store. Split it:
  - the list/overview belongs to the `<Entity>SearchStore`;
  - selecting, creating, updating and deleting a single record belongs to the
    `<Entity>DetailStore`.
  - Concretely: `editId`, `selectedEntity`, `create`, `update`, `remove`, `startEdit`
    and `cancelEdit` MUST live in the detail/edit store, never in the search/list store.

- Never perform data access directly within a store; delegate it to a data access service instead.

### Self-check before adding state to a store

- Does the store already hold list state AND a selected/edited record? → split it.
- Does the store name end in `SearchStore`, `DetailStore` or `LookupStore`? If none of
  these, justify why.
- Could a list view and an edit view import this store independently? They should
  import _different_ stores.

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
