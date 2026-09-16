# Ticketing

Ticketing covers everything a passenger does to get on a plane before check-in:
finding flights, choosing passengers and booking.

## Language

- **Flight**: a scheduled connection `from` one city `to` another on a `date`.
  Cities are named by city name ("Graz", "Hamburg"), never by airport code.
- **Delayed flight**: a flight with `delayed = true`; its `delay` is the
  expected delay in minutes.
- **Passenger**: a person who can be booked on flights; has `bonusMiles` and a
  `passengerStatus`.
- **Basket**: the flights the user has selected while searching (flight id →
  selected). It is part of the flight search state and is read by the summary
  and by the assistant tools.
- **Ticket**: a booked flight of the current user. Tickets share the `Flight`
  shape and are served by `TicketClient`.
- **Price**: an `amount` per `flightClass` of a flight.
- **Aircraft**: type and registration of the plane serving the flight.
- **Filter**: the search criteria — `from`/`to` for flights, `name`/`firstName`
  for passengers.

## Boundaries

- Ticketing owns the `Flight`, `Passenger` and ticket models and their clients.
- Other domains may only use what `api/` exposes; today it exposes nothing.
- The `ai/` layer is the assistant integration (tools and widgets) and is
  exempt from the store/client access rules.

## Invariants

- `delay` is derived when a flight is loaded: 15 minutes if `delayed`,
  otherwise 0.
- The demo API delivers neither prices nor aircraft; both are initialized to
  empty defaults on load.

## Gotchas

- `TicketClient` and `NormalizedStore` serve hard-coded demo data; there is no
  ticket backend.
- `feature-next-flights` is deliberately NgModule-based (legacy style for
  teaching) and is also embedded in the shell's dashboard.
