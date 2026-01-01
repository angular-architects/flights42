import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Luggage } from '../../data/luggage';

@Component({
  selector: 'app-luggage-card',
  imports: [],
  templateUrl: './luggage-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageCard {
  item = input.required<Luggage>();
}
