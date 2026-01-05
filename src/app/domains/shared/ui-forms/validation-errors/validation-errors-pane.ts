import { Component, computed, input } from '@angular/core';
import { MinValidationError, ValidationError } from '@angular/forms/signals';

@Component({
  selector: 'app-validation-errors-pane',
  imports: [],
  templateUrl: './validation-errors-pane.html',
})
export class ValidationErrorsPane {
  errors = input.required<ValidationError.WithField[]>();
  showFieldNames = input(false);

  errorMessages = computed(() =>
    toErrorMessages(this.errors(), this.showFieldNames()),
  );
}

function toErrorMessages(
  errors: ValidationError.WithField[],
  showFieldNames: boolean,
): string[] {
  return errors.map((error) => {
    const prefix = showFieldNames ? toFieldName(error) + ': ' : '';

    const message = error.message ?? toMessage(error);
    return prefix + message;
  });
}

function toFieldName(error: ValidationError.WithField) {
  return error.fieldTree().name().split('.').at(-1);
}

function toMessage(error: ValidationError): string {
  switch (error.kind) {
    case 'required':
      return 'Enter a value!';
    case 'roundtrip':
    case 'roundtrip_tree':
      return 'Roundtrips are not supported!';
    case 'min':
      console.log(error);
      return `Minimum amount: ${(error as MinValidationError).min}`;
    default:
      return error.kind ?? 'Validation Error';
  }
}
