/* eslint-disable @angular-eslint/prefer-standalone */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NextFlightsStore } from './next-flights-store';
import { NormalizedStore } from './normalized-store';

@Component({
  selector: 'app-next-flights',
  standalone: false,
  templateUrl: './next-flights-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NextFlightsStore],
})
export class NextFlightsOverview {
  private readonly store = inject(NextFlightsStore);
  protected readonly tickets = this.store.entities;
  protected readonly selected = this.store.selected;

  private readonly normalizedStore = inject(NormalizedStore);

  constructor() {
    this.store.load();

    console.log(
      'flightsWithPassengers',
      this.normalizedStore.flightsWithPassengers(),
    );
    console.log(
      'passengersWithFlights',
      this.normalizedStore.passengersWithFlights(),
    );
  }

  protected updateSelected(ticketId: number, selected: boolean): void {
    this.store.updateSelected(ticketId, selected);
  }
}
