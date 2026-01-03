import { inject, Injectable, signal } from '@angular/core';

import { TicketService } from '../../data/ticket-service';

@Injectable()
export class NextFlightsStore {
  private ticketService = inject(TicketService);

  private readonly ticketsResource = this.ticketService.findTickets();
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
