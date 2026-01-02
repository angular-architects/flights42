import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FlightStore } from './flight-store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlightCard } from '../../../shared/flight-card/flight-card';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { debounce, Field, form } from '@angular/forms/signals';
import { delegatedSignal } from '../../../shared/signals/delegated-signal';

@Component({
  selector: 'app-flight-search',
  imports: [Field, FlightCard, JsonPipe, RouterLink],
  templateUrl: './reactive-flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactiveFlightSearch {
  private store = inject(FlightStore);
  private snackBar = inject(MatSnackBar);

  protected readonly from = this.store.from;
  protected readonly to = this.store.to;

  // protected readonly filter = linkedSignal(() => ({
  //   from: this.from(),
  //   to: this.to()
  // }));

  protected readonly filter = delegatedSignal(
    () => ({
      from: this.from(),
      to: this.to(),
    }),
    (value) => {
      this.store.updateFilter(value.from, value.to);
    },
  );

  protected readonly filterForm = form(this.filter, (path) => {
    debounce(path.from, 300);
    debounce(path.to, 300);
  });

  protected readonly flights = this.store.flightsWithDelays;
  protected readonly isLoading = this.store.isLoading;
  protected readonly error = this.store.error;
  protected readonly loaded = this.store.loaded;

  protected readonly basket = this.store.basket;

  protected readonly flightRoute = computed(() => this.from() + ' - ' + this.to());

  constructor() {
    this.showError();

    effect(() => {
      this.logStuff();
    });
  }

  search(): void {
    // this.store.updateFilter(this.from(), this.to());
    this.store.reload();
  }

  updateBasket(flightId: number, selected: boolean): void {
    this.store.updateBasket(flightId, selected);
  }

  delay(): void {
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
