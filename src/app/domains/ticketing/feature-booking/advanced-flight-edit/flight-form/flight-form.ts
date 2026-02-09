import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

import { FieldMetaDataPane } from '../../../../shared/ui-forms/field-meta-data-pane/field-meta-data-pane';
import { ValidationErrorsPane } from '../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Flight } from '../../../data/flight';

@Component({
  selector: 'app-flight',
  imports: [FormField, ValidationErrorsPane, FieldMetaDataPane],
  templateUrl: './flight-form.html',
})
export class FlightForm {
  flight = input.required<FieldTree<Flight, string | number>>();
}
