import { inject } from '@angular/core';

import { AgUiClientToolDefinition } from '../../../shared/ui-agent/ag-ui-types';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export function createToggleFlightSelectionTool(): AgUiClientToolDefinition {
  const store = inject(FlightStore);

  return {
    name: 'toggleFlightSelection',
    description:
      'Selects a flight or deselects it. Selected flights are added to the basket.',
    parameters: {
      type: 'object',
      properties: {
        flightId: {
          type: 'number',
          description: 'id of flight to select or deselect',
        },
        selected: {
          type: 'boolean',
          description: 'whether flight should be selected or deselected',
        },
      },
      required: ['flightId', 'selected'],
    },
    execute: (args) => {
      const input = args as { flightId: number; selected: boolean };
      store.updateBasket(input.flightId, input.selected);
      return { selected: input.selected };
    },
  };
}
