import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PassengerCard } from '../passenger-card/passenger-card';
import { SummaryStore } from './summary-store';

@Component({
  selector: 'app-summary-page',
  imports: [PassengerCard],
  templateUrl: './summary-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryPage {
  private readonly store = inject(SummaryStore);

  protected readonly selectedPassengers = this.store.selectedPassengers;

  protected updatePassengerSelection(
    passengerId: number,
    selected: boolean,
  ): void {
    this.store.updatePassengerSelection(passengerId, selected);
  }
}
