import {
  apply,
  applyEach,
  applyWhenValue,
  disabled,
  min,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';

import { Flight } from './flight';
import { priceSchema } from './price-schema';

export const flightSchema = schema<Flight>((path) => {
  required(path.from);
  required(path.to);
  required(path.date);

  minLength(path.from, 3);

  // validateStandardSchema(path, FlightZodSchema);

  // TODO: Apply custom round trip validator

  // TODO: Disable delay if delayed is not true

  // TODO: Apply delayedFlightSchema if flight is delayed

  // TODO: Apply aircraftSchema to aircraft property

  // TODO: Apply priceSchema to each entry in prices array
});

export const delayedFlight = schema<Flight>((path) => {
  required(path.delay);
  min(path.delay, 15);
});

// Dynamic Zod-Schema
// const strict = signal(false);

// validateStandardSchema(
//   path,
//   computed(() => {
//     if (strict()) {
//       return StrictFlightZodSchema;
//     } else {
//       return FlightZodSchema;
//     }
//   }),
// );
