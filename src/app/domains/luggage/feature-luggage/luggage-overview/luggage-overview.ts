import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
<<<<<<< HEAD
import { injectDispatch } from '@ngrx/signals/events';
=======
>>>>>>> acd41f4 (chore: rename flight store simple)

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
  }

  protected updateSelected(luggageId: number, selected: boolean): void {
    this.store.updateSelected(luggageId, selected);
  }
}
