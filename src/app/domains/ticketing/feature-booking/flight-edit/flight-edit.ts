import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toLocalDateTimeString } from '../../../shared/util-common/date-utils';
import { Flight } from '../../data/flight';
import { FlightDetailStore } from './flight-detail-store';
import { FieldTree } from '@angular/forms/signals';

@Component({
  selector: 'app-flight-edit',

  // TODO: Import FormField, FormRoot and the JSON pipe
  imports: [RouterLink],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit {
  private readonly store = inject(FlightDetailStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = input.required<number>();

  protected readonly flight = linkedSignal(() =>
    normalizeFlight(this.store.flightValue()),
  );
  protected readonly isPending = this.store.saveFlightIsPending;

  // TODO: create flightForm for flight signal

  protected readonly isDisabled = computed(
    // TODO: Also disable when flightForm is invalid
    () => this.isPending(),
  );

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const flightId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setFlightId(flightId);
    });
  }

  protected async save(form: FieldTree<Flight>) {
    // TODO: Use submit to save flight with the store
  }
}

function normalizeFlight(flight: Flight): Flight {
  return {
    ...flight,
    date: toLocalDateTimeString(flight.date),
  };
}
