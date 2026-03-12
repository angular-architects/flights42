import { computed, Signal } from '@angular/core';
import { SchemaPathTree, validateStandardSchema } from '@angular/forms/signals';
import { z } from 'zod';

import { Flight } from './flight';

export const FlightZodSchema = z.object({
  id: z.number().int(),
  from: z.string().min(3).max(20),
  to: z.string().min(3).max(20),
  date: z.string(),
  delayed: z.boolean(),
});

export const StrictFlightZodSchema = z.object({
  id: z.number().int(),
  from: z.string().min(10).max(30),
  to: z.string().min(10).max(30),
  date: z.string(),
  delayed: z.boolean(),
});

export function validateWithSchema(
  path: SchemaPathTree<Flight>,
  strict: Signal<boolean>,
) {
  validateStandardSchema(
    path,
    computed(() => {
      if (strict()) {
        return StrictFlightZodSchema;
      } else {
        return FlightZodSchema;
      }
    }),
  );
}
