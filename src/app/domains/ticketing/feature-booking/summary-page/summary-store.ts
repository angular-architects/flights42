import { computed, inject, Injectable } from '@angular/core';

import { PassengerStore } from '../passenger-search/passenger-store';

@Injectable({ providedIn: 'root' })
export class SummaryStore {
  private passengerStore = inject(PassengerStore);

  readonly selectedPassengers = computed(() => {
    const selected = this.passengerStore.selected();
    const passengers = this.passengerStore.passengers();
    return passengers.filter((passenger) => selected[passenger.id]);
  });

  updatePassengerSelection(passengerId: number, selected: boolean): void {
    this.passengerStore.updateSelected(passengerId, selected);
  }
}
