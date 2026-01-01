import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LuggageStore } from './luggage-store';
import { LuggageCard } from './luggage-card/luggage-card';

@Component({
  selector: 'app-luggage',
  imports: [LuggageCard],
  templateUrl: './luggage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Luggage {
  private store = inject(LuggageStore);
  protected readonly luggage = this.store.luggage;
}
