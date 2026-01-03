import { min, required, schema } from '@angular/forms/signals';

export interface Price {
  flightClass: string;
  amount: number;
}

export const initPrice: Price = {
  flightClass: '',
  amount: 0,
};

export const priceSchema = schema<Price>((path) => {
  required(path.flightClass);
  required(path.amount);
  min(path.amount, 0);
});
