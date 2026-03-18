import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

// import { LuggageClient } from '../../../luggage/data/luggage-client';
import { appSettings } from '../../../shared/util-common/app-settings';
import { Flight } from '../../data/flight';
import { FlightClient } from '../../data/flight-client';
import { FlightCard } from '../../ui/flight-card/flight-card';

@Component({
  selector: 'app-flight-search',
  imports: [FormField, FlightCard, JsonPipe, RouterLink],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private snackBar = inject(MatSnackBar);
  private flightClient = inject(FlightClient);

  protected readonly filter = signal({
    from: 'Graz',
    to: 'Hamburg',
  });

  protected readonly filterForm = form(this.filter, (path) => {
    debounce(path.from, appSettings.debounceTimeMs);
    debounce(path.to, appSettings.debounceTimeMs);
  });
  protected readonly delayInMin = signal(0);

  protected readonly flightsResource = this.flightClient.findResource(
    this.filterForm.from().value,
    this.filterForm.to().value,
  );

  protected readonly flights = this.flightsResource.value;
  protected readonly isLoading = this.flightsResource.isLoading;
  protected readonly error = this.flightsResource.error;

  protected readonly basket = signal<Record<number, boolean>>({});

  protected readonly flightRoute = computed(
    () => this.filter().from + ' - ' + this.filter().to,
  );

  protected readonly flightsWithDelay = computed(() =>
    toFlightsWithDelays(this.flights(), this.delayInMin()),
  );

  constructor() {
    effect(() => {
      const error = this.error();
      if (error || this.filter().to === 'error') {
        const message = 'Error loading flights: ' + error;
        this.snackBar.open(message, 'OK');
      }
    });

    effect(() => {
      this.logFilter();
    });
  }

  private logFilter() {
    console.log('filter', this.filter());
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
    this.delayInMin.update((delay) => delay + 15);
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
