import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { Flight } from '../../data/flight';
import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../data/flight-store';

const getLoadedFlightsSchema = z.object({});

export type GetLoadedFlightsArgs = z.infer<typeof getLoadedFlightsSchema>;

const getLoadedFlightsDescription = `
    Returns the currently loaded/displayed flights (search/working set). This tool only returns data — it does not render UI.

    Use this tool whenever the user refers to one of the currently shown search results by position, for example "the first", "the second", "den zweiten", "Nummer 2", or "the last one". Treat the returned array as the current visible list in 1-based order and resolve the chosen item's \`flightId\` from it before calling booking tools.

    If the user should **see** these flights as cards, call \`showComponents\` with one \`flightWidget\` per flight (\`status: 'other'\`). Use this tool when the user asks about the current flight list or search results, or when they refer to one of those results indirectly by position.
  `;

function getLoadedFlights(_args: GetLoadedFlightsArgs): FlightInfo[] {
  const store = inject(FlightStore);
  return store.flightsValue().map(toFlightInfo);
}

export const getLoadedFlightsFrontendTool = createFrontendTool({
  name: 'getLoadedFlights',
  description: getLoadedFlightsDescription,
  parameters: getLoadedFlightsSchema,
  handler: async (args) => getLoadedFlights(args),
});

export const getLoadedFlightsTool = defineAgUiTool({
  name: 'getLoadedFlights',
  description: getLoadedFlightsDescription,
  schema: getLoadedFlightsSchema,
  execute: getLoadedFlights,
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
