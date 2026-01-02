import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { Aircraft } from '../../../data/aircraft';
import { ValidationErrorsPane } from '../../../shared/validation-errors/validation-errors-pane';

@Component({
  selector: 'app-aircraft',
  imports: [Field, ValidationErrorsPane],
  templateUrl: './aircraft-form.html',
})
export class AircraftComponent {
  aircraft = input.required<FieldTree<Aircraft>>();
}
