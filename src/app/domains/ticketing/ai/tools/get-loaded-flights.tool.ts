import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { Flight } from '../../data/flight';
import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../data/flight-store';

export const getLoadedFlightsTool = createFrontendTool({
  name: 'getLoadedFlights',
  description: `
    Returns the currently loaded/displayed flights (search/working set). This tool only returns data — it does not render UI.

    Use this tool whenever the user refers to one of the currently shown search results by position, for example "the first", "the second", "den zweiten", "Nummer 2", or "the last one". Treat the returned array as the current visible list in 1-based order and resolve the chosen item's \`flightId\` from it before calling booking tools.

    If the user should **see** these flights as cards, call the \`flightWidget\` tool once per flight (\`status: 'other'\`). Use this tool when the user asks about the current flight list or search results, or when they refer to one of those results indirectly by position.
  `,
  parameters: z.object({}),
  handler: async () => {
    const store = inject(FlightStore);
    return store.flightsValue().map(toFlightInfo);
  },
});

function toFlightInfo(flight: Flight): FlightInfo {
  return {
    id: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date,
    delay: flight.delay,
  };
}
