import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { planFlightSchema } from './plan-schemas.js';
import { commitPlan, readPlan } from './plan-store.js';
export const replaceFlightInPlanTool = createTool({
  id: 'replaceFlightInPlan',
  description:
    'Replaces a flight in the current travel plan with another one. Use this when the user wants a different flight instead of the current one on a route. Only call on explicit request.',
  inputSchema: z.object({
    oldFlightId: z
      .number()
      .describe(
        'Id of the flight currently in the plan that should be replaced',
      ),
    flight: planFlightSchema.describe('The new flight to use instead'),
  }),
  execute: async (args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const flights = plan.flights.map((flight) =>
      flight.id === args.oldFlightId ? args.flight : flight,
    );
    commitPlan(requestContext, { ...plan, flights });
    return { replaced: args.oldFlightId, with: args.flight.id };
  },
});
