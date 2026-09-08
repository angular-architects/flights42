import { effect, inject, Injector, Signal } from '@angular/core';

// Bridges a signal into the Promise-based world, e.g. into the loader of a
// resource. Called in an injection context, awaited wherever needed: the
// returned function resolves once the source takes the expected value.
export function waitFor<T>(source: Signal<T>, expected: T) {
  const injector = inject(Injector);

  return (abortSignal?: AbortSignal) =>
    new Promise<void>((resolve) => {
      const ref = effect(
        () => {
          if (!Object.is(source(), expected)) {
            return;
          }

          ref.destroy();
          resolve();
        },
        { injector },
      );

      abortSignal?.addEventListener('abort', () => ref.destroy(), {
        once: true,
      });
    });
}
