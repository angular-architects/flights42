import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { initPrice, Price } from '../../../data/price';

@Component({
  selector: 'app-prices',
  imports: [Field, ValidationErrorsComponent],
  templateUrl: './prices-form.html',
})
export class PricesComponent {
  prices = input.required<FieldTree<Price[]>>();

  addPrice(): void {
    const pricesForms = this.prices();
    pricesForms().value.update((prices) => [...prices, { ...initPrice }]);
  }
}
