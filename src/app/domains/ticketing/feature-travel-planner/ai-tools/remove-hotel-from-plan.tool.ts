import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { TravelPlanStore } from '../travel-plan-store';

export const removeHotelFromPlanTool = defineAgUiTool({
  name: 'removeHotelFromPlan',
  description:
    'Removes a hotel from the current travel plan by its id. Only call this when the user explicitly asks to remove a hotel.',
  schema: z.object({
    hotelId: z.string().describe('Id of the hotel to remove from the plan'),
  }),
  execute: (args) => {
    const store = inject(TravelPlanStore);
    store.removeHotel(args.hotelId);
    return { removed: args.hotelId };
  },
});
