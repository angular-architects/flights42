import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FlightCard } from '../../ui/flight-card/flight-card';
import { PassengerCard } from '../passenger-card/passenger-card';
import { SummaryCoordinator } from './summary-coordinator';

@Component({
  selector: 'app-summary-page',
  imports: [FlightCard, PassengerCard],
  templateUrl: './summary-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryPage {
  private readonly store = inject(SummaryCoordinator);

  protected readonly selectedFlights = this.store.selectedFlights;
  protected readonly selectedPassengers = this.store.selectedPassengers;

  protected updateFlightSelection(flightId: number, selected: boolean): void {
    this.store.updateFlightSelection(flightId, selected);
  }

  protected updatePassengerSelection(
    passengerId: number,
    selected: boolean,
  ): void {
    this.store.updatePassengerSelection(passengerId, selected);
  }
}
