import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FlightStore } from './flight-store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { FlightCard } from '../../../shared/flight-card/flight-card';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, FlightCard, JsonPipe, RouterLink],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private store = inject(FlightStore);
  private snackBar = inject(MatSnackBar);

  protected readonly from = linkedSignal(() => this.store.from());
  protected readonly to = linkedSignal(() => this.store.to());

  protected readonly flights = this.store.flightsWithDelays;
  protected readonly isLoading = this.store.isLoading;
  protected readonly error = this.store.error;
  protected readonly loaded = this.store.loaded;

  protected readonly basket = this.store.basket;

  protected readonly flightRoute = computed(() => this.from() + ' - ' + this.to());
  // protected readonly flightRoute2 = computed(() => this.from() + ' - ' + untracked(() => this.to()));

  constructor() {
    this.showError();

    effect(() => {
      this.logStuff();
    });

    this.connectFilter();
  }

  private connectFilter() {
    effect(() => {
      const from = this.from();
      const to = this.to();
      untracked(() => {
        this.store.updateFilter(from, to);
      });
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
