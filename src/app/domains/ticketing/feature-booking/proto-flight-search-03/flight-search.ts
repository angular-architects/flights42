import { DatePipe, JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Flight } from '../../data/flight';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, DatePipe, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  protected readonly from = signal('Graz');
  protected readonly to = signal('Hamburg');

  protected readonly flightsResource = httpResource<Flight[]>(
    () => ({
      url: 'https://demo.angulararchitects.io/api/flight',
      params: {
        from: this.from(),
        to: this.to(),
      },
    }),
    { defaultValue: [] },
  );

  protected readonly flights = this.flightsResource.value;
  protected readonly error = this.flightsResource.error;
  protected readonly isLoading = this.flightsResource.isLoading;

  protected readonly selectedFlight = signal<Flight | null>(null);

  protected search(): void {
    this.flightsResource.reload();
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }
}
