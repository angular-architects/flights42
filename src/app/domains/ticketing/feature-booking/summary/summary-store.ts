import { computed, inject, Injectable } from '@angular/core';

import { FlightStore } from '../flight-search/flight-store';
import { PassengerStore } from '../passenger-search/passenger-store';

@Injectable({ providedIn: 'root' })
export class SummaryStore {
  private flightStore = inject(FlightStore);
  private passengerStore = inject(PassengerStore);

  readonly selectedFlights = computed(() => {
    const basket = this.flightStore.basket();
    const flights = this.flightStore.flightsValue();
    return flights.filter((flight) => basket[flight.id]);
  });

  readonly selectedPassengers = computed(() => {
    const selected = this.passengerStore.selected();
    const passengers = this.passengerStore.passengers();
    return passengers.filter((passenger) => selected[passenger.id]);
  });

  readonly canBook = computed(() => {
    return (
      this.selectedFlights().length > 0 && this.selectedPassengers().length > 0
    );
  });

  updateFlightSelection(flightId: number, selected: boolean): void {
    this.flightStore.updateBasket(flightId, selected);
  }

  updatePassengerSelection(passengerId: number, selected: boolean): void {
    this.passengerStore.updateSelected(passengerId, selected);
  }
}
