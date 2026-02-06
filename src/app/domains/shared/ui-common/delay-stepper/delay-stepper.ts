import { Component, effect, input, model } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

@Component({
  selector: 'app-delay-stepper',
  imports: [],
  templateUrl: './delay-stepper.html',
  styleUrl: './delay-stepper.css',
})
// TODO: Implement the interface FormValueControl<number>
export class DelayStepper {
  protected inc(): void {
    // TODO: Implement method
  }

  protected dec(): void {
    // TODO: Implement method
  }
}
