import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AgUiClientToolDefinition } from '../../../shared/ui-agent/ag-ui-types';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export function createFindFlightsTool(): AgUiClientToolDefinition {
  const store = inject(FlightStore);
  const router = inject(Router);

  return {
    name: 'findFlights',
    description: `
Searches for flights and redirects the user to the result page where the found flights are shown.

Remarks:
- For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
    `.trim(),
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'airport of departure' },
        to: { type: 'string', description: 'airport of destination' },
      },
      required: ['from', 'to'],
    },
    execute: async (args) => {
      const input = args as { from: string; to: string };
      store.updateFilter(input.from, input.to);
      await router.navigate(['/ticketing/booking/flight-search']);
      return { ok: true };
    },
  };
}
