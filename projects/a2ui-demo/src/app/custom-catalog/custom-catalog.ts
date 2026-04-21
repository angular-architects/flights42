import {
  type AngularComponentImplementation,
  BasicCatalogBase,
} from '@a2ui/angular/v0_9';
import { z, type ZodTypeAny } from 'zod/v3';

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
  .strict() as unknown as ZodTypeAny;

const milesProgressEntry: unknown = {
  name: 'MilesProgress',
  component: MilesProgress,
  schema: milesProgressSchema,
};

export const customCatalog = new BasicCatalogBase({
  id: 'https://example.com/catalogs/flights42-a2ui-demo',
  extraComponents: [milesProgressEntry as AngularComponentImplementation],
});
