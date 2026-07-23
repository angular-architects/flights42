import type { BoundProperty } from '@a2ui/angular/v0_9';
import { z } from 'zod/v3';

import { initialProperty } from './utils';

export const passengerSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  bonusMiles: z.number(),
});

export type Passenger = z.infer<typeof passengerSchema>;

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
