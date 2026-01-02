import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FlightCard } from '../../shared/flight-card/flight-card';
import { PassengerCard } from '../passenger-card/passenger-card';
import { SummaryStore } from './summary-store';

@Component({
  selector: 'app-summary',
  imports: [FlightCard, PassengerCard],
  templateUrl: './summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Summary {
  private store = inject(SummaryStore);

  protected readonly selectedFlights = this.store.selectedFlights;
  protected readonly selectedPassengers = this.store.selectedPassengers;

  updateFlightSelection(flightId: number, selected: boolean): void {
    this.store.updateFlightSelection(flightId, selected);
  }

  updatePassengerSelection(passengerId: number, selected: boolean): void {
    this.store.updatePassengerSelection(passengerId, selected);
  }
}
