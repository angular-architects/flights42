import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Luggage } from '../../../data/luggage';
import { CityPipe } from '../../../shared/city.pipe';

@Component({
  selector: 'app-luggage-card',
  imports: [CityPipe],
  templateUrl: './luggage-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageCard {
  item = input.required<Luggage>();
}
