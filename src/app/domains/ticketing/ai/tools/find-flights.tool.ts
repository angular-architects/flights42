import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const findFlightsTool = defineAgUiTool({
  name: 'findFlights',
  description: `
Searches for flights and redirects the user to the result page where the found flights are shown.

Remarks:
- For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
- Do not announce this tool call before executing it. The UI already shows that the tool is running.
- Do not render flights or flight lists in the chat after this tool: the user is taken to the booking flight-search route where results appear.
- If needed, send at most one short text confirmation after the tool call has completed.
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
  },
});
