import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod';

import { defineAgUiTool } from '../../../shared/ui-agent/ag-ui-types';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const findFlightsTool = defineAgUiTool({
  name: 'findFlights',
  description: `
Searches for flights and redirects the user to the result page where the found flights are shown.

Remarks:
- For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
    `.trim(),
  schema: z.object({
    from: z.string().describe('airport of departure'),
    to: z.string().describe('airport of destination'),
  }),
  execute: async (args) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    store.updateFilter(args.from, args.to);
    await router.navigate(['/ticketing/booking/flight-search']);
    return { ok: true };
  },
});
