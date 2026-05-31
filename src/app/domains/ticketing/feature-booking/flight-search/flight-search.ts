import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import { Flight } from '../../data/flight';

@Component({
  selector: 'app-flight-search',
  imports: [FormField, DatePipe, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private http = inject(HttpClient);

  protected readonly filter = signal({ from: 'Graz', to: 'Hamburg' });
  protected readonly filterForm = form(this.filter);

  protected readonly flightRoute = computed(
    () => this.filter().from + ' to ' + this.filter().to,
  );

  protected readonly flights = signal<Flight[]>([]);
  protected readonly selectedFlight = signal<Flight | null>(null);

  protected search(): void {
    const url = 'https://demo.angulararchitects.io/api/flight';

    const headers = {
      Accept: 'application/json',
    };

    const params = {
      from: this.filter().from,
      to: this.filter().to,
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
