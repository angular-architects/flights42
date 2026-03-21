import { inject } from '@angular/core';

import { AgUiClientToolDefinition } from '../../../shared/ui-agent/ag-ui-types';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export function createGetCurrentBasketTool(): AgUiClientToolDefinition {
  const store = inject(FlightStore);

  return {
    name: 'getCurrentBasket',
    description:
      'Returns all selected flights as an object mapping flightIds to booleans.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: () => store.basket(),
  };
}
