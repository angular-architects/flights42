import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { ValidationErrorsComponent } from '../../../../shared/validation-errors/validation-errors.component';
import { Aircraft } from '../../../../data/aircraft';

@Component({
  selector: 'app-aircraft',
  imports: [Field, ValidationErrorsComponent],
  templateUrl: './aircraft-form.html',
})
export class AircraftComponent {
  aircraft = input.required<FieldTree<Aircraft>>();
}
