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

import { aircraftSchema } from './aircraft-schema';
import { Flight } from './flight';
import {
  validateCityAsync,
  validateCityHttp,
  validateDuplicatePrices,
  validateRoundTrip,
  validateRoundTripTree,
} from './flight-validators';
import { priceSchema } from './price-schema';

export const flightSchema = schema<Flight>((path) => {
  required(path.from);
  required(path.to);
  required(path.date);

  minLength(path.from, 3);

  // validateStandardSchema(ZodFlightSchema);

  //disabled(path.delay, (ctx) => !ctx.valueOf(path.delayed));
  disabled(path.delay, (ctx) =>
    !ctx.valueOf(path.delayed) ? 'not delayed' : false,
  );

  applyWhenValue(path, (flight) => flight.delayed, delayedFlight);

  validateDuplicatePrices(path.prices);

  validateCityAsync(path.from);
  validateCityHttp(path.to);

  validateRoundTrip(path);
  validateRoundTripTree(path);

  apply(path.aircraft, aircraftSchema);
  applyEach(path.prices, priceSchema);
});

export const delayedFlight = schema<Flight>((path) => {
  required(path.delay);
  min(path.delay, 15);
});
