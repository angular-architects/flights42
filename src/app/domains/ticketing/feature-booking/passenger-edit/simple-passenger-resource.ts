import { computed, inject, Signal } from '@angular/core';
import { Params } from '@angular/router';

import { PassengerClient } from '../../data/passenger-client';

export function createSimplePassengerResource(params: Signal<Params>) {
  const passengerClient = inject(PassengerClient);
  const id = computed(() => Number(params()['id'] ?? 0));
  return passengerClient.findPassengerResourceById(id, {
    withDefaultValue: false,
  });
}
