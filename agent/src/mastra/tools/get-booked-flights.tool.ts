import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getBookedFlightsData } from '../data/booked-flights.js';

const flightWidgetSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

export const getBookedFlightsTool = createTool({
  id: 'getBookedFlights',
  description: `
Returns the booked flights (aka next flights) of the current user.
Only use this when the user explicitly asks for booked flights, tickets or checking in to a flight.
The returned flights are booked. Hence, if displayed with the flightWidget, use status: 'booked'.
  `.trim(),
  outputSchema: z.array(flightWidgetSchema),
  execute: async () => getBookedFlightsData(),
});
