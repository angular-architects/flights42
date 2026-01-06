import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
} from '@ngrx/signals';
import { setEntities, withEntities } from '@ngrx/signals/entities';

import { initAircraft } from '../../data/aircraft';
import { Flight } from '../../data/flight';
import { Passenger } from '../../data/passenger';
import { Price } from '../../data/price';

export type FlightState = Flight & {
  passengerIds: number[];
};

export type PassengerState = Passenger & {
  flightIds: number[];
};

export type FlightsWithPassengers = Flight & {
  passengers: Passenger[];
};

export type PassengersWithFlights = Passenger & {
  flights: Flight[];
};

export const NormalizedStore = signalStore(
  { providedIn: 'root' },

  withEntities({ entity: type<FlightState>(), collection: 'flight' }),
  withEntities({ entity: type<PassengerState>(), collection: 'passenger' }),
  withComputed((store) => ({
    flightsWithPassengers: computed<FlightsWithPassengers[]>(() =>
      store.flightEntities().map((f) => ({
        ...f,
        passengers: f.passengerIds.map((p) => store.passengerEntityMap()[p]),
      })),
    ),
    passengersWithFlights: computed<PassengersWithFlights[]>(() =>
      store.passengerEntities().map((p) => ({
        ...p,
        flights: p.flightIds.map((f) => store.flightEntityMap()[f]),
      })),
    ),
  })),
  withHooks({
    onInit(state) {
      const date = new Date().toISOString();

      patchState(
        state,
        setEntities(
          [
            {
              id: 10,
              from: 'London',
              to: 'New York',
              date,
              delayed: false,
              delay: 0,
              aircraft: initAircraft,
              prices: [] as Price[],
              passengerIds: [1, 3],
            },
            {
              id: 20,
              from: 'London',
              to: 'New York',
              date,
              delayed: false,
              delay: 0,
              aircraft: initAircraft,
              prices: [] as Price[],
              passengerIds: [1, 2],
            },
            {
              id: 30,
              from: 'London',
              to: 'New York',
              date,
              delayed: false,
              delay: 0,
              aircraft: initAircraft,
              prices: [] as Price[],
              passengerIds: [2, 3],
            },
          ],
          { collection: 'flight' },
        ),
      );

      patchState(
        state,
        setEntities(
          [
            {
              id: 1,
              firstName: 'Max',
              name: 'Muster',
              bonusMiles: 0,
              passengerStatus: 'A',
              flightIds: [10, 20],
            },
            {
              id: 2,
              firstName: 'Susi',
              name: 'Sorglos',
              bonusMiles: 0,
              passengerStatus: 'A',
              flightIds: [20, 30],
            },
            {
              id: 3,
              firstName: 'Jane',
              name: 'Doe',
              bonusMiles: 0,
              passengerStatus: 'A',
              flightIds: [10, 30],
            },
          ],
          { collection: 'passenger' },
        ),
      );
    },
  }),
);
