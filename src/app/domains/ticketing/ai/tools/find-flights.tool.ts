import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { FlightStore } from '../../data/flight-store';

export const findFlightsTool = createFrontendTool({
  name: 'findFlights',
  description: `
    Searches for flights and redirects the user to the result page where the found flights are shown.

    Remarks:
    - For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
    - Do not announce this tool call before executing it. The UI already shows that the tool is running.
    - Do not render flights or flight lists in the chat after this tool: the user is taken to the booking flight-search route where results appear.
    - If needed, send at most one short text confirmation after the tool call has completed.
    - Calling it is what shows the results: when the user asks for the same search again, call it again.
    - "Und retour", "and back", "zurück" refer to the previous search: call it with from and to swapped.

    Example:
    - Previous search: Graz → Madrid
    - User: "And back"
    - Call: findFlights({ "from": "Madrid", "to": "Graz" })
    - WRONG: rendering a search form, as both cities are known
  `,
  parameters: z.object({
    from: z.string().describe('airport of departure'),
    to: z.string().describe('airport of destination'),
  }),
  handler: async ({ from, to }) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    store.updateFilter(from, to);
    await router.navigate(['/ticketing/booking/flight-search']);
    return { ok: true };
  },
});
