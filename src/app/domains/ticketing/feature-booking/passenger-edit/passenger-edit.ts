import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';

import { FormComponent } from '../../../shared/util-common/exit.guard';
import { extractError } from '../../../shared/util-common/extract-error';
import { initPassenger } from '../../data/passenger';
import { passengerSchema } from '../../data/passenger-schema';
import { PassengerDetailStore } from './passenger-detail-store';

@Component({
  selector: 'app-passenger-edit',
  imports: [FormField, JsonPipe],
  templateUrl: './passenger-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerEdit implements FormComponent {
  private readonly store = inject(PassengerDetailStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = input.required<number>();

  protected readonly passenger = linkedSignal(() => {
    return this.store.passengerError()
      ? initPassenger
      : this.store.passengerValue();
  });

  // protected readonly passenger = input.required<Passenger>();

  protected readonly isPending = this.store.savePassengerIsPending;
  protected readonly passengerForm = form(this.passenger, passengerSchema);

  protected readonly isDisabled = computed(
    () => this.passengerForm().invalid() || this.isPending(),
  );

  constructor() {
    this.route.paramMap.subscribe((paramsMap) => {
      const passengerId = parseInt(paramsMap.get('id') ?? '0');
      this.store.setPassengerId(passengerId);
    });

    // this.route.data.subscribe(data => {
    //   console.log('passenger', data['passenger']);
    // });
  }

  isDirty(): boolean {
    return this.passengerForm().dirty();
  }

  protected async save(): Promise<void> {
    await submit(this.passengerForm, async (form) => {
      try {
        await this.store.savePassenger(form().value());
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
