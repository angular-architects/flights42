import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { ValidationErrorsPane } from '../../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Aircraft } from '../../../data/aircraft';

@Component({
  selector: 'app-aircraft',
  imports: [Field, ValidationErrorsPane],
  templateUrl: './aircraft-form.html',
})
export class AircraftComponent {
  aircraft = input.required<FieldTree<Aircraft>>();
}
