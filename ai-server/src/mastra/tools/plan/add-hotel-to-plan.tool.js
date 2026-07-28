import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { planHotelSchema } from './plan-schemas.js';
import { commitPlan, readPlan } from './plan-store.js';
export const addHotelToPlanTool = createTool({
  id: 'addHotelToPlan',
  description:
    'Adds a hotel to the current travel plan, or replaces the existing hotel for the same city (the plan holds at most one hotel per city). Use this both for adding a hotel and for swapping a city’s hotel for a different one. Only call when the user explicitly asks for it.',
  inputSchema: z.object({
    hotel: planHotelSchema.describe('The hotel to add to the plan'),
  }),
  execute: async (args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const hotels = [
      ...plan.hotels.filter((hotel) => hotel.city !== args.hotel.city),
      args.hotel,
    ];
    commitPlan(requestContext, { ...plan, hotels });
    return { added: args.hotel.id };
  },
});
