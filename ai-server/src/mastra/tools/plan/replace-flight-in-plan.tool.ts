import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { lookUpFlight } from './plan-lookup.js';
import { commitPlan, readPlan } from './plan-store.js';

export const replaceFlightInPlanTool = createTool({
  id: 'replaceFlightInPlan',
  description:
    'Replaces a flight in the current travel plan with another one. Use this when the user wants a different flight instead of the current one on a route. Only call on explicit request.',
  inputSchema: z.object({
    oldFlightId: z.coerce
      .number()
      .describe(
        'Id of the flight currently in the plan that should be replaced',
      ),
    newFlightId: z.coerce
      .number()
      .describe('Id of the new flight, taken from a searchFlights result'),
  }),
  execute: async (args, context) => {
    const plan = await readPlan(context);
    if (!plan.flights.some((flight) => flight.id === args.oldFlightId)) {
      const ids = plan.flights.map((flight) => flight.id).join(', ');
      throw new Error(
        `The plan was not changed: flight ${args.oldFlightId} is not in the plan. Flights in the plan: ${ids}.`,
      );
    }
    const replacement = await lookUpFlight(args.newFlightId);
    const flights = plan.flights.map((flight) =>
      flight.id === args.oldFlightId ? replacement : flight,
    );
    await commitPlan(context, { ...plan, flights });
    return {
      result: `Replaced flight ${args.oldFlightId} with flight ${replacement.id} (${replacement.from} → ${replacement.to}).`,
    };
  },
});
