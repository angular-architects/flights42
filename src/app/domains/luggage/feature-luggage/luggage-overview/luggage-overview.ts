import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { injectDispatch } from '@ngrx/signals/events';

import { LuggageCard } from '../luggage-card/luggage-card';
import { luggageEvents, LuggageStore } from './luggage-store';

@Component({
  selector: 'app-luggage',
  imports: [LuggageCard],
  templateUrl: './luggage-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageOverview {
  private readonly store = inject(LuggageStore);
  private readonly dispatch = injectDispatch(luggageEvents);

  protected readonly luggage = this.store.luggage;
  protected readonly selected = this.store.selected;

  constructor() {
    this.dispatch.loadLuggageTriggered();
  }

  protected updateSelected(luggageId: number, selected: boolean): void {
    this.store.updateSelected(luggageId, selected);
  }
}
