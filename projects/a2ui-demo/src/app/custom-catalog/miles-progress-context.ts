import type { BoundProperty } from '@a2ui/angular/v0_9';

import { initialProperty } from './utils';

export interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  bonusMiles: number;
}

export interface MilesProgressContext {
  passenger: BoundProperty<Passenger>;
}

export const initialPassenger: Passenger = {
  id: 0,
  firstName: '',
  lastName: '',
  bonusMiles: 0,
};

export const initialContext: MilesProgressContext = {
  passenger: initialProperty(initialPassenger),
};
