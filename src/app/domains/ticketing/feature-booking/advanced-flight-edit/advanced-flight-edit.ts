import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ValidationErrorsPane } from '../../../shared/ui-forms/validation-errors/validation-errors-pane';
import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { extractError } from '../../../shared/util-common/extract-error';
import { Flight } from '../../data/flight';
import { flightSchema } from '../../data/flight-schema';
import { FlightDetailStore } from '../flight-edit/flight-detail-store';
import { AircraftComponent } from './aircraft-form/aircraft-form';
import { FlightComponent } from './flight-form/flight-form';
import { PricesComponent } from './prices-form/prices-form';

@Component({
  selector: 'app-flight-edit',
  imports: [
    AircraftComponent,
    PricesComponent,
    FlightComponent,
    ValidationErrorsPane,
    RouterLink,
  ],
  templateUrl: './advanced-flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFlightEdit {
  private readonly store = inject(FlightDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly flight = linkedSignal(() =>
    normalizeFlight(this.store.flightValue()),
  );
  protected readonly isPending = this.store.saveFlightIsPending;

  protected readonly isDisabled = computed(
    () => this.flightForm().invalid() || this.isPending(),
  );
  protected readonly flightForm = form(this.flight, flightSchema);

  protected readonly disabled = computed(
    () => this.flightForm().invalid() || this.isPending(),
  );

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const flightId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setFlightId(flightId);
    });
  }

  protected async save(): Promise<void> {
    if (this.flightForm().invalid()) {
      this.snackBar.open('Please correct the validation errors.', 'OK');
      return;
    }

    // this.store.updateFlight(this.flightForm().value());

    await submit(this.flightForm, async (form) => {
      try {
        await this.store.saveFlight(form().value());
        return null;
      } catch (error) {
        return {
          kind: 'processing_error',
          error: extractError(error),
        };
      }
    });
  }
}

function normalizeFlight(flight: Flight): Flight {
  return {
    ...flight,
    date: toLocalDateTimeString(flight.date),
  };
}
