import { apply, required, schema } from '@angular/forms/signals';

import { Flight } from '../../data/flight';
import { flightSchema } from '../../data/flight-schema';

// Demonstrate how to combine a general schema
// with form-specific validators

export const flightEditSchema = schema<Flight>((path) => {
  apply(path, flightSchema);
  required(path.id);
});
