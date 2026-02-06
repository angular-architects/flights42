import { inject } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Events } from '@ngrx/signals/events';

import { Luggage } from '../../data/luggage';
import { LuggageClient } from '../../data/luggage-client';

// TODO: Create event group

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

  // TODO: Add withReducers

  // TODO: Add withEventHandlers

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
