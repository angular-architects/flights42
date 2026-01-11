import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  SimpleChanges,
} from '@angular/core';

import { CityPipe } from '../../../shared/ui-common/city.pipe';
import { Luggage } from '../../data/luggage';

@Component({
  selector: 'app-luggage-card',
  imports: [CityPipe],
  templateUrl: './luggage-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageCard implements OnInit, OnChanges, OnDestroy {
  readonly item = input.required<Luggage>();
  readonly selected = input(false);
  readonly selectedChange = output<boolean>();

  ngOnInit(): void {
    console.log('OnInit', this.item());
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('OnChanges', changes);
  }

  ngOnDestroy(): void {
    console.log('OnDestroy', this.item());
  }

  protected select() {
    this.selectedChange.emit(true);
  }

  protected deselect() {
    this.selectedChange.emit(false);
  }
}
