import { computed, inject, Injectable, signal } from '@angular/core';
import { FlightService } from '../../../data/flight-service';
import { Flight } from '../../../data/flight';

@Injectable({ providedIn: 'root' })
export class FlightStore {
  private flightService = inject(FlightService);

  // From
  private readonly _from = signal('Graz');
  readonly from = this._from.asReadonly();

  // To
  private readonly _to = signal('Hamburg');
  readonly to = this._to.asReadonly();

  // Basket
  private readonly _basket = signal<Record<number, boolean>>({});
  readonly basket = this._basket.asReadonly();

  // Delay
  private readonly _delay = signal(0);
  readonly delayInMin = this._delay.asReadonly();

  // FlightResource
  private readonly flightsResource = this.flightService.createResource(this.from, this.to);
  readonly flights = this.flightsResource.value;
  readonly isLoading = this.flightsResource.isLoading;
  readonly error = this.flightsResource.error;
  readonly loaded = computed(() => this.flightsResource.status() === 'resolved');

  // FlightsWithDelays
  readonly flightsWithDelays = computed(() =>
    toFlightsWithDelays(this.flights(), this.delayInMin()),
  );

  updateFilter(from: string, to: string): void {
    this._from.set(from);
    this._to.set(to);
    this.flightsResource.reload();
  }

  updateBasket(flightId: number, selected: boolean): void {
    this._basket.update((basket) => ({
      ...basket,
      [flightId]: selected,
    }));
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
  const oldFlights = flights;
  const oldFlight = oldFlights[0];
  const oldDate = new Date(oldFlight.date);
  const newDate = new Date(oldDate.getTime() + delay * ONE_MINUTE);
  const newFlight = { ...oldFlight, date: newDate.toISOString() };

  return [newFlight, ...flights.slice(1)];
}
