import {
  AngularComponentImplementation,
  BASIC_FUNCTIONS,
  BasicCatalogBase,
} from '@a2ui/angular/v0_9';
import { Injectable } from '@angular/core';
import { z } from 'zod/v3';

import { formatIdImplementation } from './format-id';
import { MilesProgress } from './miles-progress';

const passengerSchema = z
  .object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    bonusMiles: z.number(),
  })
  .strict();

const pathBindingSchema = z.object({ path: z.string() }).strict();

const passengerOrPathSchema = z.union([passengerSchema, pathBindingSchema]);

const milesProgressSchema = z
  .object({
    passenger: passengerOrPathSchema.optional(),
  })
  .strict();

const milesProgress = {
  name: 'MilesProgress',
  component: MilesProgress,
  schema: milesProgressSchema,
} as unknown as AngularComponentImplementation;

@Injectable({ providedIn: 'root' })
export class CustomCatalog extends BasicCatalogBase {
  constructor() {
    super({
      id: 'https://example.com/catalogs/flights42-a2ui-demo',
      extraComponents: [milesProgress],
      functions: [...BASIC_FUNCTIONS, formatIdImplementation],
    });
  }
}
