import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';

export const removeHotelFromPlanTool = createFrontendTool({
  name: 'removeHotelFromPlan',
  description:
    'Removes a hotel from the current travel plan by its id. Only call this when the user explicitly asks to remove a hotel.',
  parameters: z.object({
    hotelId: z.string().describe('Id of the hotel to remove from the plan'),
  }),
  handler: async (args) => {
    const store = inject(TravelPlanStore);
    store.removeHotel(args.hotelId);
    return { removed: args.hotelId };
  },
});
