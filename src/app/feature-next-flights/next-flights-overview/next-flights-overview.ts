/* eslint-disable @angular-eslint/prefer-standalone */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NextFlightsStore } from './next-flights-store';

@Component({
  selector: 'app-next-flights',
  standalone: false,
  templateUrl: './next-flights-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextFlightsOverview {
  private store = inject(NextFlightsStore);
  protected readonly tickets = this.store.tickets;
  protected readonly selected = this.store.selected;

  updateSelected(ticketId: number, selected: boolean): void {
    this.store.updateSelected(ticketId, selected);
  }
}
