import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';

export const removeFlightFromPlanTool = createFrontendTool({
  name: 'removeFlightFromPlan',
  description:
    'Removes a flight from the current travel plan by its id. Only call this when the user explicitly asks to remove a flight.',
  parameters: z.object({
    flightId: z.number().describe('Id of the flight to remove from the plan'),
  }),
  handler: async (args) => {
    const store = inject(TravelPlanStore);
    store.removeFlight(args.flightId);
    return { removed: args.flightId };
  },
});
