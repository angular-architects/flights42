import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { FlightStore } from '../../../domains/ticketing/feature-booking/flight-search/flight-store';

export const submitFlightSearchTool = defineAgUiTool({
  name: 'submitFlightSearch',
  description: [
    'Triggers a flight search from the dashboard flight-search tile.',
    'Updates the global flight filter and navigates the user to the booking flight-search page.',
    'Use city names with the first letter in upper case (no airport codes).',
  ].join('\n'),
  schema: z.object({
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
  }),
  execute: async (args) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    store.updateFilter(args.from, args.to);
    await router.navigate(['/ticketing/booking/flight-search']);
    return { ok: true };
  },
});
