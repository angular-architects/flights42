import { required, schema } from '@angular/forms/signals';

import { Aircraft } from './aircraft';

export const aircraftSchema = schema<Aircraft>((path) => {
  required(path.registration);
  required(path.type);
});
