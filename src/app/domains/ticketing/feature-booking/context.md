# Booking

Booking is the flow from searching flights to a bookable summary: search
flights → put them into the basket → search and select passengers → summary.

## Language

- **Flight search**: filter (`from`/`to`) plus results; its state, including
  the basket, lives in `FlightStore` (a search store).
- **Flight edit**: editing one flight, driven by the `id` route parameter;
  state in `FlightDetailStore` (a detail store), saved through a mutation.
- **Passenger search / passenger edit**: the same pair for passengers
  (`PassengerStore`, `PassengerDetailStore`).
- **Summary**: selected flights and selected passengers side by side.
  `SummaryCoordinator` combines the two search stores; **can book** means at
  least one flight and one passenger are selected.
- **Delay demo**: the "delay" button shifts the first found flight by 15
  minutes per click (`delayInMin`); it is a change-detection demo, not a
  business function.
- **Allowed airports**: flight edit only accepts "Graz", "Hamburg" and
  "Zürich" as departure.

## Boundaries

- Reference implementations for new features are `FlightSearch` and
  `FlightEdit`; model structure and style after them.
- `reactive-flight-search`, `proto-flight-edit` and `advanced-flight-edit` are
  alternative implementations of the same use cases kept for teaching. Do not
  consolidate them.
- `simple-*-store.ts` files are reduced teaching variants of the store with
  the same name; keep both in sync when the store's public shape changes.

## Gotchas

- The booking routes are lazy under `/ticketing/booking`; the chat assistant is
  initialized by a route resolver, not by a component.
- `flight-edit/:id` is guarded: `authGuard` on enter, `exitGuard` on leave
  (asks when the form is dirty).
- Flight dates are normalized to a local date-time string before they reach
  the edit form.
