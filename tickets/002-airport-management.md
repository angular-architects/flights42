---
status: draft
---

# Add airport management

## Story

Add airport management. Keep airports in memory using an `AirportClient`.
Also use airports as dropdowns when editing flights.

## Scope

- Managing airports.
- Selecting airports via dropdowns when editing flights.
- No backend; airports are kept in memory.

## Acceptance criteria

- Airports can be managed in the application.
- When editing a flight, the airports are offered as dropdowns.

## Decisions

- **Location**: new feature `feature-airports` in the ticketing domain, no new domain (decided by agent). New domains require an explicit request, and airports are part of the flight language.
- **Airport model**: `id`, three-letter `code`, `name` and `city`; flights keep referring to airports by city name (decided by agent). The `Flight` model and the flight API stay unchanged.
- **In-memory data**: `AirportClient` keeps the airports in memory in place of a backend, seeded with airports for the cities of the flight API; changes are lost on reload (decided by agent). The ticket asks for in-memory airports; application state still lives in the stores.
- **Management scope**: airport list with a filter on code, name or city, plus create, edit and delete with confirmation (decided by agent). This is the smallest set that makes airports manageable.
- **Stores**: `AirportSearchStore` and `AirportDetailStore` in the airport feature; flight edit reads airports through a feature-local `BookingLookupStore` (decided by agent). Follows the store granularity and location rules.
- **Flight edit variants**: only `FlightEdit` offers airport dropdowns; `proto-flight-edit` and `advanced-flight-edit` are unchanged (decided by agent). The variants are teaching material and must not be consolidated.
- **Allowed departure airports**: the existing validator (Graz, Hamburg, Zürich) is kept (decided by agent). Removing it would change existing behaviour beyond the ticket.
- **Navigation**: airport management is reachable at `/ticketing/airports` via a sidebar entry "Airports", without an auth guard (decided by agent). The ticket does not ask for access control.
