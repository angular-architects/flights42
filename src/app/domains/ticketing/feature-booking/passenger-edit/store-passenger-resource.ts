import { inject, resource, Signal } from '@angular/core';
import { Params } from '@angular/router';

import { waitFor } from '../../../shared/util-common/wait-for';
import { PassengerDetailStore } from './passenger-detail-store';

export function createStorePassengerResource(params: Signal<Params>) {
  const store = inject(PassengerDetailStore);
  const passengerLoaded = waitFor(store.passengerIsLoading, false);

  return resource({
    params: () => Number(params()['id'] ?? 0),
    loader: async ({ params: id, abortSignal }) => {
      store.setPassengerId(id);
      await passengerLoaded(abortSignal);
      return store.passengerValue();
    },
  });
}
