import { required, schema } from '@angular/forms/signals';

export interface Aircraft {
  type: string;
  registration: string;
}

export const initAircraft: Aircraft = {
  registration: '',
  type: '',
};

export const aircraftSchema = schema<Aircraft>((path) => {
  required(path.registration);
  required(path.type);
});
