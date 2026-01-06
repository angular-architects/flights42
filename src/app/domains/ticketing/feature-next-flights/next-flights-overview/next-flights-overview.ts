/* eslint-disable @angular-eslint/prefer-standalone */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';

import { NextFlightsStore } from './next-flights-store';

@Component({
  selector: 'app-next-flights',
  standalone: false,
  templateUrl: './next-flights-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NextFlightsStore],
})
export class NextFlightsOverview implements OnInit {
  private store = inject(NextFlightsStore);
  protected readonly tickets = this.store.ticketEntities;
  protected readonly selected = this.store.selected;

  ngOnInit(): void {
    this.store.load();
  }

  updateSelected(ticketId: number, selected: boolean): void {
    this.store.updateSelected(ticketId, selected);
  }
}
