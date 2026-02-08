import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

<<<<<<< HEAD
// import { LuggageClient } from '../../../luggage/data/luggage-client';
import { appSettings } from '../../../shared/util-common/app-settings';
=======
>>>>>>> bd5de5c (feat: prepare starter kit)
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

  // TODO: add deboncing
  protected readonly filterForm = form(this.filter);

  // TODO: create flightsResource

  // TODO: get signals from resource
  protected readonly flights = signal<Flight[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<Error | null>(null);

  protected readonly basket = signal<Record<number, boolean>>({});

  protected readonly flightRoute = computed(
    () => this.filter().from + ' - ' + this.filter().to,
  );

  // TODO: add signal delayInMin with initial value 0

  // TODO: compute flights with delays

  constructor() {
    // TODO: add an effect that shows a snackbar with an error message
  }

  protected search(): void {
    // TODO: just reload the resource instead of calling the client directly
    this.isLoading.set(true);
    this.error.set(null);

    this.flightClient.find(this.filter().from, this.filter().to).subscribe({
      next: (flights) => {
        this.flights.set(flights);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set(error);
        this.isLoading.set(false);
      },
    });
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.basket.update((basket) => ({
      ...basket,
      [flightId]: selected,
    }));
  }

  protected delay(): void {
    // TODO: add 15 to delayInMin instead of directly updating flights
    this.flights.update((flights) => toFlightsWithDelays(flights, 15));
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
