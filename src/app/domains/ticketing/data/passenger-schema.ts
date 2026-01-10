import { minLength, required, schema } from '@angular/forms/signals';

import { Passenger } from './passenger';

export const passengerSchema = schema<Passenger>((path) => {
  required(path.name);
  required(path.firstName);
  minLength(path.name, 2);
  minLength(path.firstName, 2);
});
