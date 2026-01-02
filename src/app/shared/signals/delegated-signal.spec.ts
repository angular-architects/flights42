import { signal } from '@angular/core';
import { delegatedSignal } from './delegated-signal';
describe('delegated-signal', () => {
  it('...', () => {
    const source = signal(0);
    const sink = signal(0);

    const delegated = delegatedSignal({
      source: source,
      setter: (value) => {
        sink.set(value);
      },
    });

    const readOnlyDelegated = delegated.asReadonly();

    expect(delegated()).toBe(0);

    delegated.set(1);

    expect(delegated()).toBe(0);
    expect(readOnlyDelegated()).toBe(0);

    expect(sink()).toBe(1);

    delegated.update((value) => value + 10);

    expect(delegated()).toBe(0);
    expect(readOnlyDelegated()).toBe(0);

    expect(sink()).toBe(10);
  });
});
