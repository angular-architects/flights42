import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FlightDetailStore } from './flight-detail-store';
import { Field, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { Flight } from '../../../data/flight';
import { toLocalDateTimeString } from '../../../shared/date-utils';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-flight-edit',
  imports: [Field, JsonPipe],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit {
  private store = inject(FlightDetailStore);
  private route = inject(ActivatedRoute);

  private flight = linkedSignal(() => normalizeFlight(this.store.flight()));
  protected readonly isPending = this.store.isPending;

  protected readonly isDisabled = computed(() => this.flightForm().invalid() || this.isPending());
  protected readonly flightForm = form(this.flight, (path) => {
    required(path.from);
    required(path.to);
    required(path.date);
    minLength(path.from, 3);

    const allowed = ['Graz', 'Hamburg', 'Zürich'];
    validate(path.from, (ctx) => {
      const value = ctx.value();
      if (allowed.includes(value)) {
        return null;
      }

      return {
        kind: 'city',
        value,
        allowed,
      };
    });
  });

  protected readonly disabled = computed(() => this.flightForm().invalid() || this.isPending());

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const flightId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setFlightId(flightId);
    });
  }

  async save(): Promise<void> {
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

function extractError(error: unknown) {
  if (error && typeof error === 'object' && 'error' in error) {
    return error.error;
  }
  return error;
}
