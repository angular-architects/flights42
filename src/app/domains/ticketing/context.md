# Ticketing

Everything before check-in: finding flights, choosing passengers, booking.

## Language

- **Flight**: connection `from` → `to` on a `date`. Cities by name ("Graz"),
  never airport codes.
- **Delayed flight**: `delayed = true`; `delay` in minutes.
- **Ticket**: a booked flight of the current user; same shape as `Flight`.
- **Basket**: flights selected during search (flight id → selected); part of
  the flight search state, read by summary and assistant tools.
- **Filter**: search criteria — `from`/`to` for flights, `name`/`firstName`
  for passengers.

## Boundaries

- Owns the `Flight`, `Passenger` and ticket models and their clients.
- Other domains may only use `api/` — today it exposes nothing.
- `ai/` (assistant tools and widgets) is exempt from the store/client access
  rules.

## Invariants

- `delay` is derived on load: 15 minutes if `delayed`, else 0.
- The demo API delivers no prices and no aircraft; both default to empty.

## Gotchas

- `TicketClient` and `NormalizedStore` serve hard-coded demo data.
- `feature-next-flights` is deliberately NgModule-based (legacy teaching
  style) and embedded in the shell dashboard.
