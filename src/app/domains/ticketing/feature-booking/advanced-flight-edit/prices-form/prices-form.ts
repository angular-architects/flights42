import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { ValidationErrorsPane } from '../../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Price } from '../../../data/price';
import { initPrice } from '../../../data/price-schema';

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
