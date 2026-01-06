import { computed, inject } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';

import { Flight } from '../../data/flight';
import { TicketService } from '../../data/ticket-service';

export const NextFlightsStore = signalStore(
  withState({
    selected: {} as Record<number, boolean>,
    isLoading: false,
    error: null as string | null,
  }),

  withEntities({ entity: type<Flight>(), collection: 'ticket' }),

  withProps(() => ({
    _ticketService: inject(TicketService),
  })),

  withComputed(({ ticketEntities, selected }) => ({
    selectedTickets: computed(() =>
      ticketEntities().filter((ticket) => selected()[ticket.id]),
    ),
  })),

  withMethods((store) => ({
    load(): void {
      patchState(store, { isLoading: true, error: null });

      store._ticketService.find().subscribe({
        next: (tickets) => {
          patchState(store, setAllEntities(tickets, { collection: 'ticket' }));
          patchState(store, { isLoading: false });
        },
        error: (error) => {
          patchState(store, {
            error: error.message || 'Error loading tickets',
            isLoading: false,
          });
        },
      });
    },

    updateSelected(ticketId: number, selected: boolean): void {
      patchState(store, (state) => ({
        selected: {
          ...state.selected,
          [ticketId]: selected,
        },
      }));
    },
  })),

  withDevtools('nextFlights'),
);
