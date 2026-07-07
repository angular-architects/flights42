import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { TravelPlanStore } from '../travel-plan-store';
import { planHotelSchema } from './plan-schemas';

export const addHotelToPlanTool = defineAgUiTool({
  name: 'addHotelToPlan',
  description:
    'Adds a hotel to the current travel plan, or replaces the existing hotel for the same city (the plan holds at most one hotel per city). Use this both for adding a hotel and for swapping a city’s hotel for a different one. Only call when the user explicitly asks for it.',
  schema: z.object({
    hotel: planHotelSchema.describe('The hotel to add to the plan'),
  }),
  execute: (args) => {
    const store = inject(TravelPlanStore);
    store.addHotel(args.hotel);
    return { added: args.hotel.id };
  },
});
