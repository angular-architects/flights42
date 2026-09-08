import { computed, inject, Signal } from '@angular/core';
import { Params } from '@angular/router';

import { LuggageClient } from '../../data/luggage-client';

export function createLuggageResource(params: Signal<Params>) {
  const luggageClient = inject(LuggageClient);
  const id = computed(() => Number(params()['id'] ?? 0));
  return luggageClient.findLuggageById(id);
}
