import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { commitPlan, readPlan } from './plan-store.js';
export const removeFlightFromPlanTool = createTool({
  id: 'removeFlightFromPlan',
  description:
    'Removes a flight from the current travel plan by its id. Only call this when the user explicitly asks to remove a flight.',
  inputSchema: z.object({
    flightId: z.number().describe('Id of the flight to remove from the plan'),
  }),
  execute: async (args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const flights = plan.flights.filter(
      (flight) => flight.id !== args.flightId,
    );
    commitPlan(requestContext, { ...plan, flights });
    return { removed: args.flightId };
  },
});
