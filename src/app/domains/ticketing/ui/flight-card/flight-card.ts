import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { CityPipe } from '../../../shared/ui-common/city.pipe';
import { Flight } from '../../data/flight';

@Component({
  selector: 'app-flight-card',
  imports: [DatePipe, CityPipe],
  templateUrl: './flight-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightCard {
  readonly item = input.required<Flight>();
  readonly selected = input(false);
  readonly selectedChange = output<boolean>();

  protected select(): void {
    this.selectedChange.emit(true);
  }

  protected deselect(): void {
    this.selectedChange.emit(false);
  }
}
