import { JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Flight } from '../../data/flight';
import { FlightCard } from '../../ui/flight-card/flight-card';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, FlightCard, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  protected readonly from = signal('Graz');
  protected readonly to = signal('Hamburg');

  protected readonly flightRoute = computed(
    () => this.from() + ' to ' + this.to(),
  );
  // protected readonly flightRoute2 = computed(() => this.from() + ' to ' + untracked(() => this.to()));

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

  protected readonly delayInMin = signal(0);
  protected readonly flightsWithDelays = computed(() =>
    toFlightsWithDelays(this.flights(), this.delayInMin()),
  );

  protected readonly basket = signal<Record<number, boolean>>({});

  constructor() {
    // effect(() => {
    //   console.log('from', this.from());
    //   console.log('to', this.to());
    // });
    effect(() => {
      this.logStuff();
    });
  }

  private logStuff() {
    console.log('from', this.from());
    console.log('to', this.to());
  }

  protected search(): void {
    this.flightsResource.reload();
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.basket.update((basket) => ({
      ...basket,
      [flightId]: selected,
    }));
  }

  protected delay(): void {
    this.delayInMin.update((delayInMin) => delayInMin + 15);
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
