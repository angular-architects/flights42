import type { BoundProperty } from '@a2ui/angular/v0_9';
import { signal } from '@angular/core';
import { z } from 'zod/v3';

/**
 * Wraps a schema so the value can either be passed literally
 * or referenced via a data binding ({ path: '/...' }).
 */
export function binding<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.object({ path: z.string() }).strict()]);
}

export function initialProperty<T>(value: T): BoundProperty<T> {
  return {
    value: signal(value).asReadonly(),
    raw: value,
    onUpdate: () => undefined,
  };
}
