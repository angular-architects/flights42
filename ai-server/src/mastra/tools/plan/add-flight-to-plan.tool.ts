import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { planFlightSchema } from './plan-schemas.js';
import { commitPlan, readPlan } from './plan-store.js';

export const addFlightToPlanTool = createTool({
  id: 'addFlightToPlan',
  description:
    'Adds a flight to the current travel plan. Only call this when the user explicitly asks to add a flight to the plan.',
  inputSchema: z.object({
    flight: planFlightSchema.describe('The flight to add to the plan'),
  }),
  execute: async (args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const exists = plan.flights.some((flight) => flight.id === args.flight.id);
    const flights = exists
      ? plan.flights.map((flight) =>
          flight.id === args.flight.id ? args.flight : flight,
        )
      : [...plan.flights, args.flight];
    commitPlan(requestContext, { ...plan, flights });
    return { added: args.flight.id };
  },
});
