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
  outputSchema: z.object({
    flights: z.unknown,
    // TODO: replace unknown by an zod array of the above declared flightSchema
  }),
  execute: async () => {
    return {
      flights: [],
      // TODO: call the above imported getBookedFlights function using await
    };
  },
});
