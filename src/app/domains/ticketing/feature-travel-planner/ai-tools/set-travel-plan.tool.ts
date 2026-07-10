import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';
import { planFlightSchema, planHotelSchema } from './plan-schemas';

export const setTravelPlanTool = createFrontendTool({
  name: 'setTravelPlan',
  description: `
Replaces the ENTIRE travel plan with a new, fully consistent one (flights in
travel order + one hotel per overnight city). Use this whenever a change affects
more than one item or the city sequence — e.g. changing a flight leg that also
changes the destination city (a hotel must be swapped) or the connecting/return
flight. Build the complete new plan first (search any new flights/hotels via the
sub-agents), then commit it here in one go. Only call on explicit user request.
  `.trim(),
  parameters: z.object({
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
  handler: async (args) => {
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
