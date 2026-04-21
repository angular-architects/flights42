import type { BoundProperty } from '@a2ui/angular/v0_9';
import { signal } from '@angular/core';

export function initialProperty<T>(value: T): BoundProperty<T> {
  return {
    value: signal(value).asReadonly(),
    raw: value,
    onUpdate: () => undefined,
  };
}
