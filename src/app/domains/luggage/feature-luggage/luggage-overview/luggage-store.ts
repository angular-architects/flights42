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
import { LuggageClient } from '../../data/luggage-client';

export const luggageEvents = eventGroup({
  source: 'Luggage Store',
  events: {
    loadLuggageTriggered: type<void>(),
    loadLuggageSucceeded: type<{ luggage: Luggage[] }>(),
    loadLuggageFailed: type<{ error: string }>(),
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
    _luggageClient: inject(LuggageClient),
    _events: inject(Events),
  })),

  withReducer(
    on(luggageEvents.loadLuggageTriggered, () => ({
      isLoading: true,
      error: null,
    })),
    on(luggageEvents.loadLuggageSucceeded, ({ payload }) => ({
      luggage: payload.luggage,
      isLoading: false,
    })),
    on(luggageEvents.loadLuggageFailed, ({ payload }) => ({
      error: payload.error,
      isLoading: false,
    })),
  ),

  withEventHandlers((store) => ({
    loadLuggage$: store._events.on(luggageEvents.loadLuggageTriggered).pipe(
      switchMap(() =>
        store._luggageClient.find().pipe(
          mapResponse({
            next: (luggage: Luggage[]) =>
              luggageEvents.loadLuggageSucceeded({ luggage }),
            error: (error: unknown) =>
              luggageEvents.loadLuggageFailed({ error: String(error) }),
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
