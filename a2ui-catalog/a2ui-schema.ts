import { z } from 'zod/v3';

/**
 * Wraps a value schema in a union with a path-binding schema.
 *
 * Use this for every A2UI component prop so the caller can either provide a
 * literal value (e.g. `"Paris"`) or a path binding (e.g. `{ path: "/flight/to" }`).
 */
export const binding = <T extends z.ZodTypeAny>(value: T) =>
  z.union([value, z.object({ path: z.string() }).strict()]);

export interface A2uiComponentDefinition {
  props: z.ZodObject<z.ZodRawShape>;
  description: string;
}

export type WithoutBinding<T> = {
  [K in keyof T]: Exclude<T[K], { path: string }>;
};
