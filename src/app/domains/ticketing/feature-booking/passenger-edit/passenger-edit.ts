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
import { Passenger } from '../../data/passenger';
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

  // The underlying Router Resource; undefined when the resolver variant is active
  private readonly passengerResource =
    inject(ActivatedRoute).resources?.['passenger'];

  protected readonly id = input.required<number>();

  // Provided by the passengerResolver or by one of the Router Resources
  protected readonly passenger = input.required<Passenger>();

  protected readonly passengerModel = linkedSignal(this.passenger);

  protected readonly isPending = this.store.savePassengerIsPending;
  protected readonly passengerForm = form(this.passengerModel, passengerSchema);

  protected readonly isDisabled = computed(
    () => this.passengerForm().invalid() || this.isPending(),
  );

  isDirty(): boolean {
    return this.passengerForm().dirty();
  }

  protected reload(): void {
    // Reloads only this resource without renavigating the route
    this.passengerResource?.reload();
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
