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

import { Flight } from '../../data/flight';
import { FlightClient } from '../../data/flight-client';

export const FlightDetailStore = signalStore(
  { providedIn: 'root' },

  withState({
    flightId: 0,
  }),

  withProps(() => ({
    _flightClient: inject(FlightClient),
    _snackBar: inject(MatSnackBar),
  })),

  withResource((store) => ({
    flight: store._flightClient.findResourceById(store.flightId),
  })),

  withMutations((store) => ({
    saveFlight: store._flightClient.createSaveMutation({
      onSuccess(flight: Flight) {
        patchState(store, { flightValue: flight });
        store._snackBar.open('Flight updated successfully', 'OK', {
          duration: 3000,
        });
      },
      onError(error: unknown) {
        const message = 'Failed to update flight';
        console.error(message, error);
        store._snackBar.open(message, 'OK', {
          duration: 5000,
        });
      },
    }),
  })),

  withMethods((store) => ({
    setFlightId(id: number): void {
      patchState(store, { flightId: id });
    },

    connectFlightId: signalMethod<number>((id) => {
      patchState(store, { flightId: id });
    }),

    updateLocalFlight(flight: Partial<Flight>): void {
      patchState(store, (state) => ({
        flightValue: {
          ...state.flightValue,
          ...flight,
        },
      }));
    },

    reload(): void {
      store._flightReload();
    },
  })),

  withDevtools('flightDetail'),
);
