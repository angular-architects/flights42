import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import {
  Field,
  form,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { FormComponent } from '../../../shared/util-common/exit.guard';
import { extractError } from '../../../shared/util-common/extract-error';
import { Flight } from '../../data/flight';
import { FlightDetailStore } from './flight-detail-store';

@Component({
  selector: 'app-flight-edit',
  imports: [Field, JsonPipe, RouterLink],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit implements FormComponent {
  private readonly store = inject(FlightDetailStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = input.required<number>();

  protected readonly flight = linkedSignal(() =>
    normalizeFlight(this.store.flightValue()),
  );
  protected readonly isPending = this.store.saveFlightIsPending;

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

  protected readonly isDisabled = computed(
    () => this.flightForm().invalid() || this.isPending(),
  );

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const flightId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setFlightId(flightId);
    });

    // Alternative: signalMethod in Signal Store
    // this.store.connectFlightId(this.id);
  }

  isDirty(): boolean {
    return this.flightForm().dirty();
  }

  protected async save(): Promise<void> {
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
