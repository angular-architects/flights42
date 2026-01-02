import { Component, effect, input, model } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

@Component({
  selector: 'app-delay-stepper',
  imports: [],
  templateUrl: './delay-stepper.component.html',
  styleUrl: './delay-stepper.component.css',
})
export class DelayStepperComponent implements FormValueControl<number> {
  value = model(0);

  disabled = input(false);
  errors = input<readonly ValidationError.WithOptionalField[]>([]);

  constructor() {
    effect(() => {
      console.log('DelayStepperComponent, errors', this.errors());
    });
  }

  inc(): void {
    this.value.update((v) => v + 15);
  }

  dec(): void {
    this.value.update((v) => Math.max(v - 15, 0));
  }
}
