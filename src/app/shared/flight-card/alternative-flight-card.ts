import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Flight } from '../../data/flight';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-alternative-flight-card',
  imports: [DatePipe],
  templateUrl: './alternative-flight-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlternativeFlightCard {
  item = input.required<Flight>();
  selected = model(false);

  select() {
    this.selected.set(true);
  }

  deselect() {
    this.selected.set(false);
  }
}
