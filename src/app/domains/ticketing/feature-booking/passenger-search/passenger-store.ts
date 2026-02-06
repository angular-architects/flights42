import { inject } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';

import { Passenger } from '../../data/passenger';
import { PassengerClient } from '../../data/passenger-client';

export interface PassengerFilter {
  name: string;
  firstName: string;
}

export const PassengerStore = signalStore(
  { providedIn: 'root' },

  withState({
    name: 'Smith',
    firstName: '',
    selected: {} as Record<number, boolean>,
    passengers: [] as Passenger[],
    isLoading: false,
    error: null as string | null,
  }),

  withProps(() => ({
    _passengerClient: inject(PassengerClient),
  })),

  withMethods((store) => ({
    // TODO: Add updateFilter as rxMethod<PassengerFilter>

    updateSelected(passengerId: number, selected: boolean): void {
      patchState(store, (state) => ({
        selected: {
          ...state.selected,
          [passengerId]: selected,
        },
      }));
    },
  })),

  withDevtools('passenger'),
);
