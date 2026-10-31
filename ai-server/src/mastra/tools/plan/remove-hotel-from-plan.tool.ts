import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { canonicalCity } from '../city-aliases.js';
import { commitPlan, readPlan } from './plan-store.js';

export const removeHotelFromPlanTool = createTool({
  id: 'removeHotelFromPlan',
  description:
    'Removes the hotel in a city from the current travel plan. Only call this when the user explicitly asks to remove a hotel.',
  inputSchema: z.object({
    city: z.string().describe('City of the hotel to remove, e.g. "Rome"'),
  }),
  execute: async (args, context) => {
    const plan = await readPlan(context);
    const target = canonicalCity(args.city).toLowerCase();
    const hotels = plan.hotels.filter(
      (hotel) => canonicalCity(hotel.city).toLowerCase() !== target,
    );
    if (hotels.length === plan.hotels.length) {
      const cities = plan.hotels.map((hotel) => hotel.city).join(', ');
      return {
        result: `The plan was not changed: it has no hotel in ${args.city}. Hotels are in: ${cities || 'no city'}.`,
      };
    }
    await commitPlan(context, { ...plan, hotels });
    return { result: `Removed the hotel in ${args.city} from the plan.` };
  },
});
