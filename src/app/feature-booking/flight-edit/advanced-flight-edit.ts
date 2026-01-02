import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FlightDetailStore } from './flight-detail-store';
import { form, submit } from '@angular/forms/signals';
import { Flight, flightSchema } from '../../data/flight';
import { toLocalDateTimeString } from '../../shared/date-utils';
import { extractError } from '../../shared/extract-error';
import { ValidationErrorsPane } from '../../shared/validation-errors/validation-errors-pane';
import { AircraftComponent } from './aircraft-form/aircraft-form';
import { FlightComponent } from './flight-form/flight-form';
import { PricesComponent } from './prices-form/prices-form';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-flight-edit',
  imports: [
    AircraftComponent,
    PricesComponent,
    FlightComponent,
    ValidationErrorsPane,
  ],
  templateUrl: './advanced-flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFlightEdit {
  private store = inject(FlightDetailStore);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  protected readonly flight = linkedSignal(() =>
    normalizeFlight(this.store.flight()),
  );
  protected readonly isPending = this.store.isPending;

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

  async save(): Promise<void> {
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
