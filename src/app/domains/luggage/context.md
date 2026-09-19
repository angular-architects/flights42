# Luggage

Tracks checked bags per passenger and their delivery status.

## Language

- **Luggage item**: one bag: `passengerName`, `weight` (kg), `destination`
  (city name), `status`.
- **Status**: "Checked In" → "In Transit" → "Delivered". Free text, order
  intended.
- **Selection**: luggage items marked in the overview (id → selected).

## Boundaries

- Self-contained: `data/` + `feature-luggage`; from shared only `CityPipe`.
- Nothing depends on luggage.

## Gotchas

- `LuggageStore` is the event-driven teaching example
  (`@ngrx/signals/events`): load via `loadLuggageTriggered`, not a store
  method.
- `LuggageCard` logs its lifecycle hooks on purpose — keep them.
- `LuggageClient` serves hard-coded demo data.
