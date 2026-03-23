import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  withDevtools,
  withMutations,
  withResource,
} from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalMethod,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';

import { Passenger } from '../../data/passenger';
import { PassengerClient } from '../../data/passenger-client';

export const PassengerDetailStore = signalStore(
  { providedIn: 'root' },

  withState({
    passengerId: 0,
  }),

  withProps(() => ({
    _passengerClient: inject(PassengerClient),
    _snackBar: inject(MatSnackBar),
  })),

  withResource(
    (store) => ({
      passenger: store._passengerClient.findPassengerResourceById(
        store.passengerId,
      ),
    }),
    { errorHandling: 'previous value' },
  ),

  withMutations((store) => ({
    savePassenger: store._passengerClient.createSaveMutation({
      onSuccess(passenger: Passenger) {
        patchState(store, { passengerValue: passenger });
        store._snackBar.open('Passenger updated successfully', 'OK', {
          duration: 3000,
        });
      },
      onError(error: unknown) {
        const message = 'Failed to update passenger';
        console.error(message, error);
        store._snackBar.open(message, 'OK', {
          duration: 5000,
        });
      },
    }),
  })),

  withMethods((store) => ({
    setPassengerId(id: number): void {
      patchState(store, { passengerId: id });
    },

    connectPassengerId: signalMethod<number>((id) => {
      patchState(store, { passengerId: id });
    }),

    updateLocalPassenger(passenger: Partial<Passenger>): void {
      patchState(store, (state) => ({
        passengerValue: {
          ...state.passengerValue,
          ...passenger,
        },
      }));
    },

    reload(): void {
      store._passengerReload();
    },
  })),

  withDevtools('passengerDetail'),
);
