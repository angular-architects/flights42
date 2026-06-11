import {
  type AngularComponentImplementation,
  BASIC_FUNCTIONS,
  BasicCatalogBase,
} from '@a2ui/angular/v0_9';
import { z } from 'zod/v3';

import { formatIdImplementation } from './format-id';
import { MilesProgress } from './miles-progress';
import { binding } from './utils';

const passengerSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  bonusMiles: z.number(),
});

const milesProgressSchema = z
  .object({
    passenger: binding(passengerSchema).optional(),
    weight: z.number().optional(),
  })
  .strict();

const milesProgressEntry = {
  name: 'MilesProgress',
  component: MilesProgress,
  schema: milesProgressSchema,
} as unknown as AngularComponentImplementation;

export const customCatalog = new BasicCatalogBase({
  id: 'https://example.com/catalogs/flights42-a2ui-demo',
  extraComponents: [milesProgressEntry],
  functions: [...BASIC_FUNCTIONS, formatIdImplementation],
});
