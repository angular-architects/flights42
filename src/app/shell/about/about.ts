import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Flight } from '../../domains/ticketing/data/flight';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly flights = signal<Flight[]>([
    {
      id: 1,
      from: 'Hamburg',
      to: 'Berlin',
      date: '2025-02-01T17:00+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'A320', registration: 'D-AIUA' },
      prices: [],
    },
    {
      id: 2,
      from: 'Hamburg',
      to: 'Frankfurt',
      date: '2025-02-01T17:30+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'B737', registration: 'D-ABKA' },
      prices: [],
    },
    {
      id: 3,
      from: 'Hamburg',
      to: 'Mallorca',
      date: '2025-02-01T17:45+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'A321', registration: 'D-AISN' },
      prices: [],
    },
  ]);
}
