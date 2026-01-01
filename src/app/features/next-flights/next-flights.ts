/* eslint-disable @angular-eslint/prefer-standalone */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NextFlightsStore } from './next-flights-store';

@Component({
  selector: 'app-next-flights',
  standalone: false,
  templateUrl: './next-flights.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextFlights {
  private store = inject(NextFlightsStore);
  protected readonly tickets = this.store.tickets;
}
