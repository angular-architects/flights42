import { inject, Injectable } from '@angular/core';
import { TicketService } from '../data/ticket-service';

@Injectable({ providedIn: 'root' })
export class NextFlightsStore {
  private ticketService = inject(TicketService);

  private readonly ticketsResource = this.ticketService.findTickets();
  readonly tickets = this.ticketsResource.value;
  readonly isLoading = this.ticketsResource.isLoading;
  readonly error = this.ticketsResource.error;
}
