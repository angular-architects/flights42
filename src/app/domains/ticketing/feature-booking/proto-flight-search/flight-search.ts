import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Flight, initFlight } from '../../data/flight';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, DatePipe, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  protected readonly from = signal('Graz');
  protected readonly to = signal('Hamburg');

  protected readonly flights = signal<Flight[]>([]);
  protected readonly selectedFlight = signal<Flight | null>(null);

  protected search(): void {
    const date = new Date().toISOString();

    this.flights.set([
      {
        ...initFlight,
        id: 1,
        from: this.from(),
        to: this.to(),
        date,
      },
      {
        ...initFlight,
        id: 2,
        from: this.from(),
        to: this.to(),
        date,
        delayed: true,
      },
      {
        ...initFlight,
        id: 3,
        from: this.from(),
        to: this.to(),
        date,
      },
    ]);
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }
}
