import { Injectable, resource } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Flight } from './flight';

@Injectable({
  providedIn: 'root',
})
export class TicketClient {
  findTickets() {
    return resource({
      loader: async () => {
        return this.getTickets();
      },
      defaultValue: [],
    });
  }

  find(): Observable<Flight[]> {
    return of(this.getTickets());
  }

  private getTickets(): Flight[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 1001,
        from: 'Hamburg',
        to: 'Graz',
        date: tomorrow.toISOString(),
        delayed: false,
      },
      {
        id: 1002,
        from: 'Vienna',
        to: 'Berlin',
        date: tomorrow.toISOString(),
        delayed: true,
      },
      {
        id: 1003,
        from: 'Frankfurt',
        to: 'Paris',
        date: dayAfterTomorrow.toISOString(),
        delayed: false,
      },
    ] as Flight[];
  }
}
