import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { planFlightSchema, planHotelSchema } from './plan-schemas.js';
import { commitPlan, readPlan } from './plan-store.js';
export const setTravelPlanTool = createTool({
  id: 'setTravelPlan',
  description: `
    Replaces the ENTIRE travel plan with a new, fully consistent one (flights in
    travel order + one hotel per overnight city). Use this whenever a change affects
    more than one item or the city sequence — e.g. changing a flight leg that also
    changes the destination city (a hotel must be swapped) or the connecting/return
    flight. Build the complete new plan first (search any new flights/hotels), then
    commit it here in one go. Only call on explicit user request.
  `.trim(),
  inputSchema: z.object({
    summary: z
      .string()
      .optional()
      .describe(
        'Optional new summary. If omitted, the current summary is kept.',
      ),
    flights: z
      .array(planFlightSchema)
      .describe('The complete list of flights, in travel order.'),
    hotels: z
      .array(planHotelSchema)
      .describe('The complete list of hotels, one per overnight city.'),
  }),
  execute: async (args, { requestContext }) => {
    const current = readPlan(requestContext);
    commitPlan(requestContext, {
      summary: args.summary ?? current.summary,
      flights: args.flights,
      hotels: args.hotels,
    });
    return { flights: args.flights.length, hotels: args.hotels.length };
  },
});
