import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  schema,
  SchemaPath,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { FormComponent } from '../../../shared/util-common/exit.guard';
import { extractError } from '../../../shared/util-common/extract-error';
import { Flight } from '../../data/flight';
import { SimpleFlightDetailStore } from './simple-flight-detail-store';

const flightSchema = schema<Flight>((path) => {
  required(path.from);
  required(path.to);
  required(path.date);
  minLength(path.from, 3);

  const allowed = ['Graz', 'Hamburg', 'Zürich'];
  validateAirport(path.from, allowed);
});

@Component({
  selector: 'app-flight-edit',
  imports: [FormField, FormRoot, JsonPipe, RouterLink],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit implements FormComponent {
  private readonly store = inject(SimpleFlightDetailStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = input.required<number>();

  protected readonly flight = linkedSignal(() =>
    normalizeFlight(this.store.flight()),
  );
  protected readonly isPending = this.store.isPending;

  protected readonly strict = signal(false);

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

  protected async save(form: FieldTree<Flight>) {
    try {
      await this.store.saveFlight(form().value());
      return null;
    } catch (error) {
      return {
        kind: 'processing_error',
        error: extractError(error),
      };
    }
  }

  protected toggleStrict(): void {
    this.strict.update((s) => !s);
  }
}

function validateAirport(path: SchemaPath<string>, allowed: string[]) {
  validate(path, (ctx) => {
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
}

function normalizeFlight(flight: Flight): Flight {
  return {
    ...flight,
    date: toLocalDateTimeString(flight.date),
  };
}
