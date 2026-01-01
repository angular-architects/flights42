import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Passenger } from '../../../data/passenger';

@Component({
  selector: 'app-passenger-card',
  imports: [],
  templateUrl: './passenger-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerCard {
  item = input.required<Passenger>();
  selected = input(false);
  selectedChange = output<boolean>();

  select() {
    this.selectedChange.emit(true);
  }

  deselect() {
    this.selectedChange.emit(false);
  }
}
