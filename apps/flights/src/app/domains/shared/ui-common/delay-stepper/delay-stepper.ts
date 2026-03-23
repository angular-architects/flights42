import { Component, effect, input, model } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

@Component({
  selector: 'app-delay-stepper',
  imports: [],
  templateUrl: './delay-stepper.html',
  styleUrl: './delay-stepper.css',
})
export class DelayStepper implements FormValueControl<number> {
  readonly value = model(0);

  readonly disabled = input(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);

  constructor() {
    effect(() => {
      console.log('DelayStepper, errors', this.errors());
    });
  }

  protected inc(): void {
    this.value.update((v) => v + 15);
  }

  protected dec(): void {
    this.value.update((v) => Math.max(v - 15, 0));
  }
}
