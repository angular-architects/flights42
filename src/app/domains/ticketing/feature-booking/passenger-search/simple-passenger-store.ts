import { computed, inject, Injectable, signal } from '@angular/core';

import { withPreviousValue } from '../../../shared/util-common/with-previous-value';
import { PassengerClient } from '../../data/passenger-client';

@Injectable({ providedIn: 'root' })
export class SimplePassengerStore {
  private passengerClient = inject(PassengerClient);

  // Name
  private readonly _name = signal('Smith');
  readonly name = this._name.asReadonly();

  // FirstName
  private readonly _firstName = signal('');
  readonly firstName = this._firstName.asReadonly();

  // Selected
  private readonly _selected = signal<Record<number, boolean>>({});
  readonly selected = this._selected.asReadonly();

  // PassengerResource

  private readonly originalPassengerResource =
    this.passengerClient.findResource(this.name, this.firstName);

  private readonly passengersResource = withPreviousValue(
    this.originalPassengerResource,
  );

  readonly passengers = this.passengersResource.value;
  readonly isLoading = this.passengersResource.isLoading;
  readonly error = this.passengersResource.error;
  readonly loaded = computed(
    () => this.passengersResource.status() === 'resolved',
  );

  updateFilter(name: string, firstName: string): void {
    this._name.set(name);
    this._firstName.set(firstName);
    this.originalPassengerResource.reload();
  }

  updateSelected(passengerId: number, selected: boolean): void {
    this._selected.update((current) => ({
      ...current,
      [passengerId]: selected,
    }));
  }

  reload(): void {
    this.originalPassengerResource.reload();
  }
}
