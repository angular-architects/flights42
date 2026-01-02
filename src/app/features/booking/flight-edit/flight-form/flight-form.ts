import { Component, input } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { ValidationErrorsComponent } from '../../../../shared/validation-errors/validation-errors.component';
import { DelayStepperComponent } from '../../../../shared/delay-stepper/delay-stepper.component';
import { FieldMetaDataComponent } from '../../../../shared/field-meta-data/field-meta-data.component';
import { Flight } from '../../../../data/flight';

@Component({
  selector: 'app-flight',
  imports: [
    Field,
    ValidationErrorsComponent,
    DelayStepperComponent,
    FieldMetaDataComponent,
  ],
  templateUrl: './flight-form.html',
})
export class FlightComponent {
  flight = input.required<FieldTree<Flight, string | number>>();
}
