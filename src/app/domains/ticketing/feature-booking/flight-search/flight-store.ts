import { computed, inject } from '@angular/core';
import { withDevtools, withResource } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';

import { Flight } from '../../data/flight';
import { FlightClient } from '../../data/flight-client';

export interface FlightFilter {
  from: string;
  to: string;
}

export const FlightStore = signalStore(
  { providedIn: 'root' },

  withState({
    from: 'Graz',
    to: 'Hamburg',
    basket: {} as Record<number, boolean>,
    delayInMin: 0,
  }),

  withProps(() => ({
    _flightClient: inject(FlightClient),
  })),

  withResource(
    (store) => ({
      flights: store._flightClient.findResource(store.from, store.to),
    }),
    { errorHandling: 'previous value' },
  ),

  withComputed((store) => ({
    flightsWithDelays: computed(() =>
      toFlightsWithDelays(store.flightsValue(), store.delayInMin()),
    ),
  })),

  withMethods((store) => ({
    updateFilter(from: string, to: string): void {
      patchState(store, { from, to });
    },

    updateBasket(flightId: number, selected: boolean): void {
      patchState(store, (state) => ({
        basket: {
          ...state.basket,
          [flightId]: selected,
        },
      }));
    },

    reload(): void {
      store._flightsReload();
    },

    delay(): void {
      patchState(store, (state) => ({
        delayInMin: state.delayInMin + 15,
      }));
    },
  })),

  withDevtools('flight'),
);

function toFlightsWithDelays(flights: Flight[], delay: number): Flight[] {
  if (flights.length === 0) {
    return [];
  }

  const ONE_MINUTE = 1000 * 60;
  const oldFlights = flights;
  const oldFlight = oldFlights[0];
  const oldDate = new Date(oldFlight.date);
  const newDate = new Date(oldDate.getTime() + delay * ONE_MINUTE);
  const newFlight = { ...oldFlight, date: newDate.toISOString() };

  return [newFlight, ...flights.slice(1)];
}
