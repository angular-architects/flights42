import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod';

import { createFrontendTool } from '../../../domains/shared/util-copilotkit/tool-definition';
import { FlightStore } from '../../../domains/ticketing/data/flight-store';

export const submitFlightSearchTool = createFrontendTool({
  name: 'submitFlightSearch',
  description: `
    Triggers a flight search from the dashboard flight-search tile.
    Updates the global flight filter and navigates the user to the booking flight-search page.
    Use city names with the first letter in upper case (no airport codes).
  `,
  parameters: z.object({
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
  }),
  handler: async ({ from, to }) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    store.updateFilter(from, to);
    await router.navigate(['/ticketing/booking/flight-search']);
    return { ok: true };
  },
});
