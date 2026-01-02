import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Passenger } from '../../../data/passenger';

@Component({
  selector: 'app-passenger-card',
  imports: [],
  templateUrl: './passenger-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerCard {
  item = input.required<Passenger>();
  selected = model(false);

  select() {
    this.selected.set(true);
  }

  deselect() {
    this.selected.set(false);
  }
}
