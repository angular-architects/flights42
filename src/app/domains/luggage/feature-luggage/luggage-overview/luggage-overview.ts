import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LuggageCard } from '../luggage-card/luggage-card';
import { LuggageStore } from './luggage-store';

@Component({
  selector: 'app-luggage',
  imports: [LuggageCard],
  templateUrl: './luggage-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageOverview {
  private readonly store = inject(LuggageStore);

  // TODO: inject Dispatcher for Signal Store Event API

  protected readonly luggage = this.store.luggage;
  protected readonly selected = this.store.selected;

  constructor() {
    // TODO: dispatch event to load luggage
    // this.dispatcher.dispatch(luggageEvents.loadLuggage());
  }

  protected updateSelected(luggageId: number, selected: boolean): void {
    this.store.updateSelected(luggageId, selected);
  }
}
