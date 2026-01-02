import { apply, required, schema } from '@angular/forms/signals';
import { Flight, flightSchema } from '../../../data/flight';

// Demonstrate how to combine a general schema
// with form-specific validators

export const flightEditSchema = schema<Flight>((path) => {
  apply(path, flightSchema);
  required(path.id);
});
