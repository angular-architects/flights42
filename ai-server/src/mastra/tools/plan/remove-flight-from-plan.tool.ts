import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { commitPlan, readPlan } from './plan-store.js';

export const removeFlightFromPlanTool = createTool({
  id: 'removeFlightFromPlan',
  description:
    'Removes a flight from the current travel plan by its id. Only call this when the user explicitly asks to remove a flight.',
  inputSchema: z.object({
    flightId: z.coerce
      .number()
      .describe('Id of the flight to remove from the plan'),
  }),
  execute: async (args, context) => {
    const plan = await readPlan(context);
    const flights = plan.flights.filter(
      (flight) => flight.id !== args.flightId,
    );
    if (flights.length === plan.flights.length) {
      const ids = plan.flights.map((flight) => flight.id).join(', ');
      return {
        result: `The plan was not changed: flight ${args.flightId} is not in the plan. Flights in the plan: ${ids}.`,
      };
    }
    await commitPlan(context, { ...plan, flights });
    return { result: `Removed flight ${args.flightId} from the plan.` };
  },
});
