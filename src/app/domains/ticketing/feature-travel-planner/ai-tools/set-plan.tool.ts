import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { TravelPlanStore } from '../travel-plan-store';
import { planFlightSchema, planHotelSchema } from './plan-schemas';

export const setPlanTool = defineAgUiTool({
  name: 'setPlan',
  description: `
Replaces the entire travel plan with the one you pass in. It is stored 1:1, so
include everything you want to keep. List flights in travel order and each hotel
right after the flight that arrives in its city. Only call on an explicit user
request.
  `.trim(),
  schema: z.object({
    summary: z
      .string()
      .optional()
      .describe(
        'Optional new summary. If omitted, the current summary is kept.',
      ),
    flights: z
      .array(planFlightSchema)
      .describe('All flights, in travel order.'),
    hotels: z
      .array(planHotelSchema)
      .describe('All hotels, each after the flight arriving in its city.'),
  }),
  execute: (args) => {
    const store = inject(TravelPlanStore);
    store.setPlan({
      summary: args.summary ?? store.summary(),
      flights: args.flights,
      hotels: args.hotels,
    });
    return {
      flights: args.flights.length,
      hotels: args.hotels.length,
    };
  },
});
