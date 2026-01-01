import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  selected = input(false);
  selectedChange = output<boolean>();

  select() {
    this.selectedChange.emit(true);
  }

  deselect() {
    this.selectedChange.emit(false);
  }
}
