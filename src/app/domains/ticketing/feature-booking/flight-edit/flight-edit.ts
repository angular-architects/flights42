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
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { FormComponent } from '../../../shared/util-common/exit.guard';
import { Flight } from '../../data/flight';
import { FlightDetailStore } from './flight-detail-store';

@Component({
  selector: 'app-flight-edit',
  imports: [FormField, FormRoot, JsonPipe, RouterLink],
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

  protected readonly strict = signal(false);

  protected readonly flightForm = form(this.flight);

  protected readonly isPending = signal(false);

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
    console.log('Not implemented in this branch');
  }

  protected toggleStrict(): void {
    this.strict.update((s) => !s);
  }
}

function normalizeFlight(flight: Flight): Flight {
  return {
    ...flight,
    date: toLocalDateTimeString(flight.date),
  };
}
