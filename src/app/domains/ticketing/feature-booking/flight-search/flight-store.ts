import { computed, inject, Injectable, signal } from '@angular/core';

import { Flight } from '../../data/flight';
import { FlightClient } from '../../data/flight-client';

@Injectable({ providedIn: 'root' })
export class FlightStore {
  private flightClient = inject(FlightClient);

  // From
  private readonly _from = signal('Graz');
  readonly from = this._from.asReadonly();

  // To
  private readonly _to = signal('Hamburg');
  readonly to = this._to.asReadonly();

  // Delay
  private readonly _delay = signal(0);
  readonly delayInMin = this._delay.asReadonly();

  // Flights
  private readonly flightsResource = this.flightClient.findResource(
    this.from,
    this.to,
  );
  readonly flights = this.flightsResource.value;
  readonly flightsIsLoading = this.flightsResource.isLoading;
  readonly flightsError = this.flightsResource.error;

  // Derived state
  readonly flightsWithDelays = computed(() =>
    toFlightsWithDelays(this.flights(), this.delayInMin()),
  );

  updateFilter(from: string, to: string): void {
    this._from.set(from);
    this._to.set(to);
  }

  reload(): void {
    this.flightsResource.reload();
  }

  delay(): void {
    this._delay.update((delay) => delay + 15);
  }
}

function toFlightsWithDelays(flights: Flight[], delay: number): Flight[] {
  if (flights.length === 0) {
    return [];
  }

  const ONE_MINUTE = 1000 * 60;
  const oldFlight = flights[0];
  const oldDate = new Date(oldFlight.date);
  const newDate = new Date(oldDate.getTime() + delay * ONE_MINUTE);
  const newFlight = { ...oldFlight, date: newDate.toISOString() };

  return [newFlight, ...flights.slice(1)];
}
