import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

import { ValidationErrorsPane } from '../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Aircraft } from '../../../data/aircraft';

@Component({
  selector: 'app-aircraft',
  imports: [FormField, ValidationErrorsPane],
  templateUrl: './aircraft-form.html',
})
export class AircraftComponent {
  aircraft = input.required<FieldTree<Aircraft>>();
}
