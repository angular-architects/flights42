import { inject, Injectable, signal } from '@angular/core';

import { TicketClient } from '../../data/ticket-client';

@Injectable()
export class SimpleNextFlightsStore {
  private ticketClient = inject(TicketClient);

  private readonly ticketsResource = this.ticketClient.findTickets();
  readonly tickets = this.ticketsResource.value;
  readonly isLoading = this.ticketsResource.isLoading;
  readonly error = this.ticketsResource.error;

  // Selected
  private readonly _selected = signal<Record<number, boolean>>({});
  readonly selected = this._selected.asReadonly();

  updateSelected(ticketId: number, selected: boolean): void {
    this._selected.update((current) => ({
      ...current,
      [ticketId]: selected,
    }));
  }
}
