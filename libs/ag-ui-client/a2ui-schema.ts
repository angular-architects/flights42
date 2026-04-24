import type { BoundProperty } from '@a2ui/angular/v0_9';
import type { Signal, Type } from '@angular/core';
import type { z } from 'zod';

type StripPathBinding<T> = T extends { path: string } ? never : T;

export type ContextFromSchema<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  [K in keyof z.infer<TSchema>]-?: BoundProperty<
    StripPathBinding<NonNullable<z.infer<TSchema>[K]>>
  >;
};

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
