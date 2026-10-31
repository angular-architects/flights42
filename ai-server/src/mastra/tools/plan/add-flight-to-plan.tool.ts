import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { lookUpFlight } from './plan-lookup.js';
import { commitPlan, readPlan } from './plan-store.js';

export const addFlightToPlanTool = createTool({
  id: 'addFlightToPlan',
  description:
    'Adds a flight to the current travel plan by its id. Only call this when the user explicitly asks to add a flight to the plan.',
  inputSchema: z.object({
    flightId: z.coerce
      .number()
      .describe('Id of the flight to add, taken from a searchFlights result'),
  }),
  execute: async (args, context) => {
    const plan = await readPlan(context);
    const flight = await lookUpFlight(args.flightId);
    const flights = [
      ...plan.flights.filter((existing) => existing.id !== flight.id),
      flight,
    ];
    await commitPlan(context, { ...plan, flights });
    return {
      result: `Added flight ${flight.id} (${flight.from} → ${flight.to}) to the plan.`,
    };
  },
});
