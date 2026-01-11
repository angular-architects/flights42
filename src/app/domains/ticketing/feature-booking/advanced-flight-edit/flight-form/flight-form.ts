import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { DelayStepper } from '../../../../shared/ui-common/delay-stepper/delay-stepper';
import { FieldMetaDataPane } from '../../../../shared/ui-forms/field-meta-data-pane/field-meta-data-pane';
import { ValidationErrorsPane } from '../../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { Flight } from '../../../data/flight';

@Component({
  selector: 'app-flight',
  imports: [Field, ValidationErrorsPane, DelayStepper, FieldMetaDataPane],
  templateUrl: './flight-form.html',
})
export class FlightComponent {
  flight = input.required<FieldTree<Flight, string | number>>();
}
