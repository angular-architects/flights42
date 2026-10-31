import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { lookUpHotel, sameCity } from './plan-lookup.js';
import { commitPlan, readPlan } from './plan-store.js';

export const addHotelToPlanTool = createTool({
  id: 'addHotelToPlan',
  description:
    'Adds a hotel in a city to the current travel plan, or replaces the existing hotel for that city (the plan holds at most one hotel per city). Use this both for adding a hotel and for swapping a city’s hotel for a better or cheaper one. Only call when the user explicitly asks for it.',
  inputSchema: z.object({
    city: z.string().describe('City of the hotel, e.g. "Paris"'),
    stars: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .nullish()
      .describe(
        'Star rating of the hotel: 3 (budget), 4 (standard), 5 (luxury). Omit it for the standard 4-star hotel.',
      ),
  }),
  execute: async (args, context) => {
    const plan = await readPlan(context);
    const hotel = lookUpHotel(args.city, args.stars ?? undefined);
    const hotels = [
      ...plan.hotels.filter((existing) => !sameCity(existing.city, hotel.city)),
      hotel,
    ];
    await commitPlan(context, { ...plan, hotels });
    return { result: `The plan now has ${hotel.name} (${hotel.stars} stars).` };
  },
});
