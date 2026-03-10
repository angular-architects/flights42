import {
  linkedSignal,
  Resource,
  resourceFromSnapshots,
  ResourceSnapshot,
} from '@angular/core';

export function withPreviousValue<T>(input: Resource<T>): Resource<T> {
  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snap, previous) => {
      if (snap.status === 'loading' && previous?.value?.status === 'resolved') {
        return { ...snap, value: previous.value.value };
      }
      if (snap.status === 'error' && previous?.value?.status === 'resolved') {
        // Notify a service to display an error message
        return {
          status: 'resolved',
          value: previous.value.value,
        };
      }
      return snap;
    },
  });

  return resourceFromSnapshots(derived);
}
