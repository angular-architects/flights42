import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';
import { planFlightSchema } from './plan-schemas';

export const replaceFlightInPlanTool = createFrontendTool({
  name: 'replaceFlightInPlan',
  description:
    'Replaces a flight in the current travel plan with another one. Use this when the user wants a different flight instead of the current one on a route. Only call on explicit request.',
  parameters: z.object({
    oldFlightId: z
      .number()
      .describe(
        'Id of the flight currently in the plan that should be replaced',
      ),
    flight: planFlightSchema.describe('The new flight to use instead'),
  }),
  handler: async (args) => {
    const store = inject(TravelPlanStore);
    store.replaceFlight(args.oldFlightId, args.flight);
    return { replaced: args.oldFlightId, with: args.flight.id };
  },
});
