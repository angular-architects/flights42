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
  private store = inject(LuggageStore);
  protected readonly luggage = this.store.luggage;
  protected readonly selected = this.store.selected;

  updateSelected(luggageId: number, selected: boolean): void {
    this.store.updateSelected(luggageId, selected);
  }
}
