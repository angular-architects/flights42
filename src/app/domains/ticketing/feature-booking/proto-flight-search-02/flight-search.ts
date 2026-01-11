import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
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

  protected readonly flights = signal<Flight[]>([]);
  protected readonly error = signal<Error | null>(null);
  protected readonly selectedFlight = signal<Flight | null>(null);

  protected search(): void {
    const url = 'https://demo.angulararchitects.io/api/flight';
    const params = {
      from: this.from(),
      to: this.to(),
    };

    const headers = {
      accept: 'application/json',
    };

    this.error.set(null);

    this.http.get<Flight[]>(url, { params, headers }).subscribe({
      next: (flights) => {
        this.flights.set(flights);
      },
      error: (error: Error) => {
        console.error('error loading flights', error);
        this.error.set(error);
      },
    });
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }
}
