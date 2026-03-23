import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';

import { Passenger } from '../../data/passenger';

@Component({
  selector: 'app-passenger-card',
  imports: [],
  templateUrl: './passenger-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerCard {
  readonly item = input.required<Passenger>();
  readonly selected = model(false);

  protected select() {
    this.selected.set(true);
  }

  protected deselect() {
    this.selected.set(false);
  }
}
