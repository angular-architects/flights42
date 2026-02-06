import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

// import { LuggageClient } from '../../../luggage/data/luggage-client';
import { FlightCard } from '../../ui/flight-card/flight-card';
import { SimpleFlightStore } from './simple-flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [FormField, FlightCard, JsonPipe, RouterLink],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private readonly store = inject(SimpleFlightStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly filter = linkedSignal(() => ({
    from: this.store.from(),
    to: this.store.to(),
  }));

  protected readonly filterForm = form(this.filter);

  protected readonly flights = this.store.flightsWithDelays;

  protected readonly rawFlights = this.store.flightsValue;
  protected readonly isLoading = this.store.flightsIsLoading;
  protected readonly error = this.store.flightsError;

  protected readonly basket = this.store.basket;

  protected readonly flightRoute = computed(
    () => this.filter().from + ' - ' + this.filter().to,
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

      // this.myService.deleteEntireInternet();
      //  userId(), loading()
    });
  }

  private logFilter() {
    console.log('Filter: ', this.filter());
  }

  protected search(): void {
    this.store.updateFilter(this.filter().from, this.filter().to);
    this.store.reload();
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.store.updateBasket(flightId, selected);
  }

  protected delay(): void {
    this.store.delay();
  }

  private logStuff() {
    console.log('filter', this.filter());
  }
}
