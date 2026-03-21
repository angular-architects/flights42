import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AgUiClientToolDefinition } from '../../../shared/ui-agent/ag-ui-types';

export function createDisplayFlightDetailTool(): AgUiClientToolDefinition {
  const router = inject(Router);

  return {
    name: 'displayFlightDetail',
    description:
      'Routes to the detail of a flight. This detail view can be used to edit the flight.',
    parameters: {
      type: 'object',
      properties: {
        flightId: {
          type: 'number',
          description: 'flightId of the flight to display',
        },
      },
      required: ['flightId'],
    },
    execute: async (args) => {
      const input = args as { flightId: number };
      await router.navigate(['/ticketing/booking/flight-edit', input.flightId]);
      return { ok: true };
    },
  };
}
