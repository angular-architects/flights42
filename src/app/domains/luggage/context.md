# Luggage

Luggage tracks checked bags per passenger and their delivery status.

## Language

- **Luggage item**: one bag with `passengerName`, `weight` in kilograms,
  `destination` (a city name) and `status`.
- **Status**: the bag's position in its life cycle: "Checked In" → "In
  Transit" → "Delivered". Today it is free text; the order is the intended
  one.
- **Selection**: the luggage items the user has marked in the overview (id →
  selected).

## Boundaries

- Luggage is self-contained: `data/` (model and client with demo data) and
  `feature-luggage`. From shared it only uses `CityPipe` for display.
- No other domain depends on luggage.

## Gotchas

- `LuggageStore` is the event-driven teaching example
  (`@ngrx/signals/events`): loading is triggered by dispatching
  `loadLuggageTriggered`, not by calling a store method.
- `LuggageCard` logs its lifecycle hooks on purpose (teaching); keep the logs.
- `LuggageClient` serves hard-coded demo data; there is no luggage backend.
