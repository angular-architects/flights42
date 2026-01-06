import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Dispatcher } from '@ngrx/signals/events';

import { LuggageCard } from '../luggage-card/luggage-card';
import { luggageEvents, LuggageStore } from './luggage-store';

@Component({
  selector: 'app-luggage',
  imports: [LuggageCard],
  templateUrl: './luggage-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageOverview {
  private store = inject(LuggageStore);
  private dispatcher = inject(Dispatcher);

  protected readonly luggage = this.store.luggage;
  protected readonly selected = this.store.selected;

  constructor() {
    this.dispatcher.dispatch(luggageEvents.loadLuggage());
  }

  updateSelected(luggageId: number, selected: boolean): void {
    this.store.updateSelected(luggageId, selected);
  }
}
