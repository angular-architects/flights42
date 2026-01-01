import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NextFlightsStore } from './next-flights-store';
import { FlightCard } from '../booking/flight-card/flight-card';

@Component({
  selector: 'app-next-flights',
  imports: [FlightCard],
  templateUrl: './next-flights.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextFlights {
  private store = inject(NextFlightsStore);
  protected readonly tickets = this.store.tickets;
}
