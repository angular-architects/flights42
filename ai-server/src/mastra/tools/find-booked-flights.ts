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
    flights: z.array(flightSchema),
  }),
  execute: async () => ({
    flights: await getBookedFlights(),
  }),
});
