# Booking

Search flights → basket → search and select passengers → summary.

## Language

- **Flight search / passenger search**: filter + results; `FlightStore`,
  `PassengerStore` (search stores). The basket is part of the flight search
  state.
- **Flight edit / passenger edit**: one entity by `id` route param;
  `FlightDetailStore`, `PassengerDetailStore` (detail stores), saved through a
  mutation.
- **Summary**: selected flights and passengers side by side;
  `SummaryCoordinator` combines both search stores. **Can book** = at least
  one of each.
- **Delay demo**: the "delay" button shifts the first found flight by 15
  minutes per click — change-detection demo, not business logic.

## Boundaries

- `FlightSearch` and `FlightEdit` are the reference implementations; model new
  features after them.
- `reactive-flight-search`, `proto-flight-edit`, `advanced-flight-edit`:
  teaching alternatives of the same use cases. Do not consolidate.
- `simple-*-store.ts`: reduced teaching variants; keep in sync with the
  store's public shape.

## Invariants

- Flight edit accepts only "Graz", "Hamburg" and "Zürich" as departure.
- Flight dates are normalized to a local date-time string before the edit
  form.

## Gotchas

- Routes are lazy under `/ticketing/booking`; the chat assistant is
  initialized by a route resolver, not by a component.
- `flight-edit/:id`: `authGuard` on enter, `exitGuard` on leave (asks when
  dirty).
