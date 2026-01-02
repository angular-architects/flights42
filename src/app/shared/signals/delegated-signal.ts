import { linkedSignal, WritableSignal } from '@angular/core';

export function delegatedSignal<T>(getter: () => T, setter: (value: T) => void): WritableSignal<T> {
  const read = linkedSignal(getter);

  return Object.assign(read, {
    set: setter,
    update(fn: (value: T) => T) {
      setter(fn(read()));
    },
    asReadonly() {
      return read;
    },
  });
}
