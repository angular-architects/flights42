import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

import { ValidationErrorsPane } from '../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Price } from '../../../data/price';
import { initialPrice } from '../../../data/price-schema';

@Component({
  selector: 'app-prices',
  imports: [FormField, ValidationErrorsPane],
  templateUrl: './prices-form.html',
})
export class PricesForm {
  readonly prices = input.required<FieldTree<Price[]>>();

  addPrice(): void {
    const prices = this.prices();
    prices().value.update((prices) => [...prices, { ...initialPrice }]);
  }
}
