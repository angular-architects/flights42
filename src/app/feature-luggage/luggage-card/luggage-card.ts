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
import { Luggage } from '../../data/luggage';
import { CityPipe } from '../../shared/city.pipe';

@Component({
  selector: 'app-luggage-card',
  imports: [CityPipe],
  templateUrl: './luggage-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageCard implements OnInit, OnChanges, OnDestroy {
  item = input.required<Luggage>();
  selected = input(false);
  selectedChange = output<boolean>();

  ngOnInit(): void {
    console.log('OnInit', this.item());
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('OnChanges', changes);
  }

  ngOnDestroy(): void {
    console.log('OnDestroy', this.item());
  }

  select() {
    this.selectedChange.emit(true);
  }

  deselect() {
    this.selectedChange.emit(false);
  }
}
