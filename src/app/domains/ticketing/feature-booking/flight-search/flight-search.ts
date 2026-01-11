import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { FlightCard } from '../../ui/flight-card/flight-card';
import { CarPane } from '../upselling/car-pane';
import { HotelPane } from '../upselling/hotel-pane';
import { Placeholder } from '../upselling/placeholder';
import { TentPane } from '../upselling/tent-pane';
import { FlightStore } from './flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [
    FormsModule,
    FlightCard,
    JsonPipe,
    RouterLink,
    CarPane,
    TentPane,
    HotelPane,
    Placeholder,
  ],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private readonly store = inject(FlightStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly from = linkedSignal(() => this.store.from());
  protected readonly to = linkedSignal(() => this.store.to());

  protected readonly flights = this.store.flightsWithDelays;
  protected readonly isLoading = this.store.flightsIsLoading;
  protected readonly error = this.store.flightsError;

  protected readonly basket = this.store.basket;

  protected readonly flightRoute = computed(
    () => this.from() + ' - ' + this.to(),
  );
  // protected readonly flightRoute2 = computed(() => this.from() + ' - ' + untracked(() => this.to()));

  constructor() {
    this.showError();

    effect(() => {
      this.logStuff();
    });
  }

  protected search(): void {
    this.store.updateFilter(this.from(), this.to());
    this.store.reload();
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.store.updateBasket(flightId, selected);
  }

  protected delay(): void {
    this.store.delay();
  }

  private logStuff() {
    console.log('from', this.from());
    console.log('to', this.to());
  }

  private showError() {
    effect(() => {
      const error = this.error();
      if (error || this.to() === 'error') {
        const message = 'Error loading flights: ' + error;
        this.snackBar.open(message, 'OK');
      }
    });
  }
}
