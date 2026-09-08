import { inject } from '@angular/core';
import {
  patchState,
  signalMethod,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';

import { PassengerClient } from '../../data/passenger-client';

// Lightweight alternative to the PassengerDetailStore: exposes its resource as
// a whole, so a Router Resource can hand the very same resource to the router.
export const PassengerStore = signalStore(
  { providedIn: 'root' },

  withState({
    passengerId: 0,
  }),

  withProps((store) => {
    // No default value: a resource that already has a value does not block
    const _passenger = inject(PassengerClient).findPassengerResourceById(
      store.passengerId,
      { withDefaultValue: false },
    );

    // Members starting with _ are private in NgRx Signals
    return {
      _passenger,
      passenger: _passenger.asReadonly(),
    };
  }),

  withMethods((store) => ({
    // Accepts a value or a signal; with a signal, the id stays in sync reactively
    load: signalMethod<number>((id) => patchState(store, { passengerId: id })),
  })),
);
