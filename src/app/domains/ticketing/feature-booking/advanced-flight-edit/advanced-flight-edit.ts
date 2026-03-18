import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FieldTree, form, FormRoot } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ValidationErrorsPane } from '../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { extractError } from '../../../shared/util-common/extract-error';
import { Flight } from '../../data/flight';
import { flightSchema } from '../../data/flight-schema';
import { AircraftForm } from './aircraft-form/aircraft-form';
import { FlightForm } from './flight-form/flight-form';
import { PricesForm } from './prices-form/prices-form';
import { FlightDetailStore } from '../flight-edit/flight-detail-store';

@Component({
  selector: 'app-flight-edit',
  imports: [
    AircraftForm,
    PricesForm,
    FlightForm,
    ValidationErrorsPane,
    RouterLink,
    FormRoot,
  ],
  templateUrl: './advanced-flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFlightEdit {
  private readonly store = inject(FlightDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly flight = linkedSignal(() => this.store.flightValue());
  protected readonly isPending = signal(false);

  protected readonly isDisabled = computed(
    () => this.flightForm().invalid() || this.isPending(),
  );

  protected readonly flightForm = form(this.flight, flightSchema, {
    submission: {
      action: async (form) => this.save(form),
      ignoreValidators: 'none',
      onInvalid: (form) => this.reportValidationError(form),
    },
  });

  protected readonly disabled = computed(
    () => this.flightForm().invalid() || this.isPending(),
  );

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const flightId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setFlightId(flightId);
    });

    effect(() => {
      console.log('Flight:', this.flight());
    });
  }

  private reportValidationError(form: FieldTree<Flight>): void {
    this.snackBar.open('Please correct the validation errors', 'OK');

    const errors = form().errorSummary();
    if (errors.length > 0) {
      errors[0].fieldTree().focusBoundControl();
    }
  }

  protected async save(form: FieldTree<Flight>) {
    console.log('not implemented in this branch');
  }
}
