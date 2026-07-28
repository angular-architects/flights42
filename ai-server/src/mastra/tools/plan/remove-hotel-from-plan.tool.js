import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { commitPlan, readPlan } from './plan-store.js';
export const removeHotelFromPlanTool = createTool({
  id: 'removeHotelFromPlan',
  description:
    'Removes a hotel from the current travel plan by its id. Only call this when the user explicitly asks to remove a hotel.',
  inputSchema: z.object({
    hotelId: z.string().describe('Id of the hotel to remove from the plan'),
  }),
  execute: async (args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const hotels = plan.hotels.filter((hotel) => hotel.id !== args.hotelId);
    commitPlan(requestContext, { ...plan, hotels });
    return { removed: args.hotelId };
  },
});
