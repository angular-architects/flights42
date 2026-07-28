import { Signal, Type } from '@angular/core';
import type { z } from 'zod/v3';

import { type ContextFromSchema } from './a2ui-schema';

export interface A2uiCustomCatalogComponent<
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
  component: A2uiCustomCatalogComponent<TName, TSchema>,
): A2uiCustomCatalogComponent<TName, TSchema> {
  return component;
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

export interface A2uiCustomCatalog {
  id: string;
  components: A2uiCustomCatalogComponent[];
  functions?: A2uiCustomCatalogFunction[];
}

export function createCustomCatalog<const TCatalog extends A2uiCustomCatalog>(
  catalog: TCatalog,
): TCatalog {
  return catalog;
}
