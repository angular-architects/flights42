import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';
import { planFlightSchema } from './plan-schemas';

export const addFlightToPlanTool = createFrontendTool({
  name: 'addFlightToPlan',
  description:
    'Adds a flight to the current travel plan. Only call this when the user explicitly asks to add a flight to the plan.',
  parameters: z.object({
    flight: planFlightSchema.describe('The flight to add to the plan'),
  }),
  handler: async (args) => {
    const store = inject(TravelPlanStore);
    store.addFlight(args.flight);
    return { added: args.flight.id };
  },
});
