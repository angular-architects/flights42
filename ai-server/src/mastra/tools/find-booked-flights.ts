/* eslint-disable @typescript-eslint/no-unused-vars */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getBookedFlights } from '../data/booked-flights-store.js';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

export const findBookedFlightsTool = createTool({
  id: 'findBookedFlights',
  description:
    'Returns the flights that are already booked by the current passenger.',
  inputSchema: z.object({}),
  // TODO: declare the output as an array of flights
  //       (see flightSchema above)
  outputSchema: z.any(),
  execute: async () => {
    // TODO: Call await getBookedFlights() to get flights
    return {
      flights: [],
    };
  },
});
