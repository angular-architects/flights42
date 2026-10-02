import type { BoundProperty } from '@a2ui/angular/v0_9';
import { z } from 'zod/v3';

export type BoundProps<T> = {
  [K in keyof T]: BoundProperty<Exclude<T[K], { path: string }>>;
};

/**
 * Wraps a value schema in a union with a path-binding schema.
 *
 * Use this for every A2UI component prop so the caller can either provide a
 * literal value (e.g. `"Paris"`) or a path binding (e.g. `{ path: "/flight/to" }`).
 */
export const binding = <T extends z.ZodTypeAny>(value: T) =>
  z.union([value, z.object({ path: z.string() }).strict()]);
