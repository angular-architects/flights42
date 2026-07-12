import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { FlightInfo } from '../../data/flight-info';

@Component({
  selector: 'app-flight-card',
  imports: [DatePipe],
  templateUrl: './flight-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightCard {
  readonly item = input.required<FlightInfo>();
  readonly selected = input(false);
  readonly readonly = input(false);
  readonly selectedChange = output<boolean>();

  protected select() {
    this.selectedChange.emit(true);
  }

  protected deselect() {
    this.selectedChange.emit(false);
  }
}
