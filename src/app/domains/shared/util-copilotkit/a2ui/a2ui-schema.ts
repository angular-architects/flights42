import type { BoundProperty } from '@a2ui/angular/v0_9';
import { z } from 'zod/v3';

type StripPathBinding<T> = T extends { path: string } ? never : T;

export type ContextFromSchema<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  [K in keyof z.infer<TSchema>]-?: BoundProperty<
    StripPathBinding<NonNullable<z.infer<TSchema>[K]>>
  >;
};

/**
 * Wraps a value schema in a union with a path-binding schema.
 *
 * Use this for every A2UI component prop so the caller can either provide a
 * literal value (e.g. `"Paris"`) or a path binding (e.g. `{ path: "/flight/to" }`).
 */
export const binding = <T extends z.ZodTypeAny>(value: T) =>
  z.union([value, z.object({ path: z.string() }).strict()]);
