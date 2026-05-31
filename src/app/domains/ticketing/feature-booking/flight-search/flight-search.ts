import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Flight } from '../../data/flight';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, DatePipe, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private http = inject(HttpClient);

  protected readonly from = signal('Graz');
  protected readonly to = signal('Hamburg');

  protected readonly flightRoute = computed(
    () => this.from() + ' to ' + this.to(),
  );

  protected readonly flights = signal<Flight[]>([]);
  protected readonly selectedFlight = signal<Flight | null>(null);

  protected search(): void {
    const url = 'https://demo.angulararchitects.io/api/flight';

    const headers = {
      Accept: 'application/json',
    };

    const params = {
      from: this.from(),
      to: this.to(),
    };

    this.http.get<Flight[]>(url, { headers, params }).subscribe({
      next: (flights) => {
        this.flights.set(flights);
      },
      error: (err) => {
        console.error('Error loading flights', err);
      },
    });
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }
}
