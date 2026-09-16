---
status: draft
---

# Share the airport store

## Story

Use the same airport store for airport management and flight editing.

## Scope

- Builds on `002-airport-management`.
- Airport management and flight editing.

## Acceptance criteria

- Airport management and flight editing use the same airport store.
- Changes made in airport management are visible in the airport dropdowns
  when editing flights.

## Decisions

- **Store location**: `AirportSearchStore` moves from `feature-airports` to the ticketing `data` layer; `BookingLookupStore` is removed (decided by agent). A store needed by a second feature moves down a layer; both features are in the same domain, so `shared` is not involved.
- **Filter**: the store loads all airports and applies the filter only to a derived `filteredAirports` list (decided by agent). Otherwise a filter set in airport management would also narrow the flight edit dropdowns.
- **Detail store**: `AirportDetailStore` stays local to `feature-airports` (decided by agent). Only the airport list is shared.
- **Keeping the list current**: after saving or deleting, airport edit reloads the shared `AirportSearchStore`; the reloads on opening airport search and flight edit are removed (decided by agent). Stores must not depend on each other, and one explicit reload makes the change visible in both features.
