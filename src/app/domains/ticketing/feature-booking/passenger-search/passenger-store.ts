import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';

import { Passenger } from '../../data/passenger';
import { PassengerService } from '../../data/passenger-service';

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
    _passengerService: inject(PassengerService),
  })),

  withMethods((store) => {
    return {
      updateFilter: rxMethod<PassengerFilter>(
        pipe(
          tap((filter) =>
            patchState(store, {
              name: filter.name,
              firstName: filter.firstName,
              isLoading: true,
              error: null,
            }),
          ),
          switchMap((filter) =>
            store._passengerService.find(filter.name, filter.firstName).pipe(
              catchError((error) => {
                patchState(store, { error });
                return of([]);
              }),
            ),
          ),
          tap((passengers) => {
            patchState(store, { passengers, isLoading: false });
          }),
        ),
      ),
      updateSelected(passengerId: number, selected: boolean): void {
        patchState(store, (state) => ({
          selected: {
            ...state.selected,
            [passengerId]: selected,
          },
        }));
      },
    };
  }),
);
