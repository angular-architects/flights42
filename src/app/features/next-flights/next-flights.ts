import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NextFlightsStore } from './next-flights-store';
import { FlightCard } from '../../shared/flight-card/flight-card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-next-flights',
  imports: [FlightCard, RouterLink],
  templateUrl: './next-flights.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextFlights {
  private store = inject(NextFlightsStore);
  protected readonly tickets = this.store.tickets;
}
