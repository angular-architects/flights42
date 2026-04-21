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
- This tool already triggers the UI transition to the page that shows the flights.
- After calling this tool, do NOT render flight results in the chat; the target page already shows them.
- Do NOT summarize or list the found flights yourself.
- For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
- Do not announce this tool call before executing it. The UI already shows that the tool is running.
- Finish the turn with a single \`renderA2ui\` call that contains at most a short confirmation text (e.g. that matching flights are now shown). Do not render the found flights themselves.
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
