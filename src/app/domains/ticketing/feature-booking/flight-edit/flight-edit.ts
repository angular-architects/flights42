import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { FormComponent } from '../../../shared/util-common/exit.guard';
import { Flight } from '../../data/flight';
import { SimpleFlightDetailStore } from './simple-flight-detail-store';

@Component({
  selector: 'app-flight-edit',
  imports: [FormField, JsonPipe, RouterLink],
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

  protected readonly flightForm = form(this.flight);

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
    await this.store.saveFlight(this.flight());
  }
}

function normalizeFlight(flight: Flight): Flight {
  return {
    ...flight,
    date: toLocalDateTimeString(flight.date),
  };
}
