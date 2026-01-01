import { computed, inject, Injectable, signal } from '@angular/core';
import { PassengerService } from '../../data/passenger-service';

@Injectable({ providedIn: 'root' })
export class PassengerStore {
  private passengerService = inject(PassengerService);

  // Name
  private readonly _name = signal('');
  readonly name = this._name.asReadonly();

  // FirstName
  private readonly _firstName = signal('');
  readonly firstName = this._firstName.asReadonly();

  // Basket
  private readonly _basket = signal<Record<number, boolean>>({});
  readonly basket = this._basket.asReadonly();

  // PassengerResource
  private readonly passengersResource = this.passengerService.createResource(
    this.name,
    this.firstName,
  );
  readonly passengers = this.passengersResource.value;
  readonly isLoading = this.passengersResource.isLoading;
  readonly error = this.passengersResource.error;
  readonly loaded = computed(() => this.passengersResource.status() === 'resolved');

  updateFilter(name: string, firstName: string): void {
    this._name.set(name);
    this._firstName.set(firstName);
  }

  updateBasket(passengerId: number, selected: boolean): void {
    this._basket.update((basket) => ({
      ...basket,
      [passengerId]: selected,
    }));
  }
}
