import {
  type AngularComponentImplementation,
  BASIC_FUNCTIONS,
  BasicCatalogBase,
} from '@a2ui/angular/v0_9';
import { z, type ZodTypeAny } from 'zod/v3';

import { formatIdImplementation } from './format-id';
import { MilesProgress } from './miles-progress';

const dynamicObjectSchema = z.union([
  z.record(z.unknown()),
  z.object({ path: z.string() }).strict(),
]);

const milesProgressSchema = z
  .object({
    passenger: dynamicObjectSchema.optional(),
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
