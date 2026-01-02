import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';

import { Flight } from '../../../data/flight';
import { DelayStepperComponent } from '../../../shared/delay-stepper/delay-stepper.component';
import { FieldMetaDataPane } from '../../../shared/field-meta-data-pane/field-meta-data-pane';
import { ValidationErrorsPane } from '../../../shared/validation-errors/validation-errors-pane';

@Component({
  selector: 'app-flight',
  imports: [
    Field,
    ValidationErrorsPane,
    DelayStepperComponent,
    FieldMetaDataPane,
  ],
  templateUrl: './flight-form.html',
})
export class FlightComponent {
  flight = input.required<FieldTree<Flight, string | number>>();
}
