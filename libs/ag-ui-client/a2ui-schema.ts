import type { BoundProperty } from '@a2ui/angular/v0_9';
import type { Signal, Type } from '@angular/core';
import { z } from 'zod';

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

export interface CustomCatalogEntry<
  TName extends string = string,
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  name: TName;
  description: string;
  schema: TSchema;
  component: Type<{
    props: Signal<ContextFromSchema<TSchema>>;
  }>;
}

export function createCustomComponent<
  const TName extends string,
  const TSchema extends z.ZodObject<z.ZodRawShape>,
>(
  entry: CustomCatalogEntry<TName, TSchema>,
): CustomCatalogEntry<TName, TSchema> {
  return entry;
}

export type A2uiCustomCatalogReturnType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'any'
  | 'void';

export interface A2uiCustomCatalogFunction<
  TName extends string = string,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: TName;
  description: string;
  returnType: A2uiCustomCatalogReturnType;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => unknown;
}

export function createCustomFunction<
  const TName extends string,
  const TSchema extends z.ZodTypeAny,
>(
  fn: A2uiCustomCatalogFunction<TName, TSchema>,
): A2uiCustomCatalogFunction<TName, TSchema> {
  return fn;
}
