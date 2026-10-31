import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { lookUpFlight, lookUpHotel, sameCity } from './plan-lookup.js';
import { commitPlan, readPlan } from './plan-store.js';

export const setTravelPlanTool = createTool({
  id: 'setTravelPlan',
  description: `
    Replaces the ENTIRE travel plan with a new, fully consistent one (flights in
    travel order + one hotel per overnight city). Use this whenever a change affects
    more than one item or the city sequence — e.g. changing a flight leg that also
    changes the destination city (a hotel must be swapped) or the connecting/return
    flight. Search any new flights first, then commit the complete new plan here in
    one go. Only call on explicit user request.
  `.trim(),
  inputSchema: z.object({
    summary: z
      .string()
      .optional()
      .describe(
        'Optional new summary. If omitted, the current summary is kept.',
      ),
    flightIds: z
      .array(z.coerce.number())
      .describe(
        'Ids of ALL flights of the new plan, in travel order, e.g. [516, 8414, 8447]. Keep the ids of unchanged flights.',
      ),
    hotels: z
      .array(
        z.object({
          city: z.string().describe('City of the hotel, e.g. "Rome"'),
          stars: z.coerce
            .number()
            .int()
            .min(1)
            .max(5)
            .nullish()
            .describe(
              'Star rating: 3 (budget), 4 (standard), 5 (luxury). Omit it to keep the current hotel of that city, or to take the 4-star hotel if the city has none yet.',
            ),
        }),
      )
      .describe('ALL hotels of the new plan, one per overnight city.'),
  }),
  execute: async (args, context) => {
    const current = await readPlan(context);
    const flights = await Promise.all(args.flightIds.map(lookUpFlight));
    const hotels = args.hotels.map(({ city, stars }) => {
      const kept = current.hotels.find((hotel) => sameCity(hotel.city, city));
      return stars == null && kept
        ? kept
        : lookUpHotel(city, stars ?? undefined);
    });
    await commitPlan(context, {
      summary: args.summary ?? current.summary,
      flights,
      hotels,
    });
    return {
      result: `The plan now has ${flights.length} flights and ${hotels.length} hotels.`,
    };
  },
});
