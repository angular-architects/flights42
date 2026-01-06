import { inject } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { mapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import {
  Events,
  on,
  withEventHandlers,
  withReducer,
} from '@ngrx/signals/events';
import { switchMap } from 'rxjs';

import { Luggage } from '../../data/luggage';
import { LuggageService } from '../../data/luggage-service';

export const luggageEvents = eventGroup({
  source: 'Luggage Store',
  events: {
    loadLuggage: type<void>(),
    loadLuggageSuccess: type<{ luggage: Luggage[] }>(),
    loadLuggageError: type<{ error: string }>(),
  },
});

export const LuggageStore = signalStore(
  { providedIn: 'root' },

  withState({
    luggage: [] as Luggage[],
    selected: {} as Record<number, boolean>,
    isLoading: false,
    error: null as string | null,
  }),

  withProps(() => ({
    _luggageService: inject(LuggageService),
    _events: inject(Events),
  })),

  withReducer(
    on(luggageEvents.loadLuggage, () => ({
      isLoading: true,
      error: null,
    })),
    on(luggageEvents.loadLuggageSuccess, ({ payload }) => ({
      luggage: payload.luggage,
      isLoading: false,
    })),
    on(luggageEvents.loadLuggageError, ({ payload }) => ({
      error: payload.error,
      isLoading: false,
    })),
  ),

  withEventHandlers((store) => ({
    loadLuggage$: store._events.on(luggageEvents.loadLuggage).pipe(
      switchMap(() =>
        store._luggageService.find().pipe(
          mapResponse({
            next: (luggage: Luggage[]) =>
              luggageEvents.loadLuggageSuccess({ luggage }),
            error: (error: unknown) =>
              luggageEvents.loadLuggageError({ error: String(error) }),
          }),
        ),
      ),
    ),
  })),

  withMethods((store) => ({
    updateSelected(luggageId: number, selected: boolean): void {
      patchState(store, (state) => ({
        selected: {
          ...state.selected,
          [luggageId]: selected,
        },
      }));
    },
  })),

  withDevtools('luggage'),
);
