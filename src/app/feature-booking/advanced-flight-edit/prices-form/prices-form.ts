import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { initPrice, Price } from '../../../data/price';
import { ValidationErrorsPane } from '../../../shared/validation-errors/validation-errors-pane';

@Component({
  selector: 'app-prices',
  imports: [Field, ValidationErrorsPane],
  templateUrl: './prices-form.html',
})
export class PricesComponent {
  prices = input.required<FieldTree<Price[]>>();

  addPrice(): void {
    const pricesForms = this.prices();
    pricesForms().value.update((prices) => [...prices, { ...initPrice }]);
  }
}
