import {
  linkedSignal,
  Resource,
  resourceFromSnapshots,
  ResourceSnapshot,
  Signal,
} from '@angular/core';

import { Luggage } from './luggage';

export function withMinWeight(
  input: Resource<Luggage[]>,
  minWeight: Signal<number>,
): Resource<Luggage[]> {
  const derived = linkedSignal<
    { snap: ResourceSnapshot<Luggage[]>; min: number },
    ResourceSnapshot<Luggage[]>
  >({
    source: () => ({
      snap: input.snapshot(),
      min: minWeight(),
    }),
    computation: ({ snap, min }) => {
      if (snap.status === 'resolved') {
        return {
          ...snap,
          value: snap.value.filter((item) => item.weight >= min),
        };
      }
      return snap;
    },
  });

  return resourceFromSnapshots(derived);
}
