import { computed, inject, Signal } from '@angular/core';
import { Params } from '@angular/router';

import { PassengerStore } from './passenger-store';

export function createSharedPassengerResource(params: Signal<Params>) {
  const store = inject(PassengerStore);
  const id = computed(() => Number(params()['id'] ?? 0));
  store.load(id);
  return store.passenger;
}
