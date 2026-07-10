import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-basket',
  imports: [],
  templateUrl: './basket.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Basket {
  protected readonly items = signal([
    { id: 3, route: 'Graz - Hamburg' },
    { id: 5, route: 'Hamburg - Graz' },
  ]);
}
