import { z } from 'zod/v3';

import { binding, type BoundProps, initialProperty } from './utils';

export const passengerSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  bonusMiles: z.number(),
});

export type Passenger = z.infer<typeof passengerSchema>;

export const milesProgressSchema = z
  .object({
    passenger: binding(passengerSchema),
  })
  .strict();

export type MilesProgressContext = BoundProps<
  z.infer<typeof milesProgressSchema>
>;

export const initialPassenger: Passenger = {
  id: 0,
  firstName: '',
  lastName: '',
  bonusMiles: 0,
};

export const initialContext: MilesProgressContext = {
  passenger: initialProperty(initialPassenger),
};
