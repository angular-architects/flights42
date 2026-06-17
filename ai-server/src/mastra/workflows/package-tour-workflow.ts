import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { findHotelsForCity } from '../tools/find-hotels.js';
import { searchFlights } from '../tools/search-flights.js';
import {
  reportStepStatus,
  reportToolCall,
  type StepProgressContext,
} from './bridge.js';
import { planFinalizerAgent } from './plan-finalizer-agent.js';
import {
  finalPlanSchema,
  legSchema,
  loadedDataSchema,
  roughPlanSchema,
} from './schemas.js';
import { createPlan, overnightCitiesFromLegs } from './utils.js';

const findFlightsStep = createStep({
  id: 'findFlights',
  description:
    'Loads flight candidates for every leg of the rough plan, restricted to the planned day.',
  inputSchema: roughPlanSchema,
  outputSchema: z.object({ legs: z.array(legSchema) }),
  execute: async ({ inputData, writer, requestContext }) => {
    const ctx: StepProgressContext = {
      writer,
      requestContext,
      stepName: 'findFlights',
    };
    await reportStepStatus(ctx, 'findFlights', 'started');

    const legs = await Promise.all(
      inputData.flights.map(async (leg) => {
        const candidates = await searchFlights(leg.from, leg.to, leg.date);
        reportToolCall(
          ctx,
          'searchFlights',
          { from: leg.from, to: leg.to, date: leg.date },
          candidates,
        );
        return { from: leg.from, to: leg.to, date: leg.date, candidates };
      }),
    );

    await reportStepStatus(ctx, 'findFlights', 'finished', {
      legCount: legs.length,
    });
    return { legs };
  },
});

const findHotelsStep = createStep({
  id: 'findHotels',
  description:
    'Loads hotel options for every city of the rough plan (deterministic, no agent).',
  inputSchema: z.object({ legs: z.array(legSchema) }),
  outputSchema: loadedDataSchema,
  execute: async ({ inputData, writer, requestContext }) => {
    const ctx: StepProgressContext = {
      writer,
      requestContext,
      stepName: 'findHotels',
    };
    await reportStepStatus(ctx, 'findHotels', 'started');

    const overnightCities = overnightCitiesFromLegs(inputData.legs);

    const destinations = overnightCities.map((city) => {
      const hotels = findHotelsForCity(city);
      reportToolCall(ctx, 'findHotels', { city }, { city, hotels });
      return { city, hotels };
    });

    await reportStepStatus(ctx, 'findHotels', 'finished', {
      cityCount: destinations.length,
    });
    return { legs: inputData.legs, destinations };
  },
});

const finalizeStep = createStep({
  id: 'finalize',
  description:
    'Lets an agent pick the concrete flights and hotels and build the final plan.',
  inputSchema: loadedDataSchema,
  outputSchema: finalPlanSchema,
  execute: async ({ inputData, getInitData, writer, requestContext }) => {
    const ctx: StepProgressContext = { writer, requestContext };
    await reportStepStatus(ctx, 'finalize', 'started');

    const init = getInitData<z.infer<typeof roughPlanSchema>>();

    const result = await planFinalizerAgent.generate(
      [
        {
          role: 'user',
          content: `
            Original user request: ${init.userPrompt}

            Available flights per leg (in travel order):
            ${JSON.stringify(inputData.legs, null, 2)}

            Available hotels per city:
            ${JSON.stringify(inputData.destinations, null, 2)}`,
        },
      ],
      { structuredOutput: { schema: finalPlanSchema } },
    );

    const raw = result.object ?? { summary: '', flights: [], hotels: [] };
    const plan = createPlan(raw, inputData.legs, inputData.destinations);

    await reportStepStatus(ctx, 'finalize', 'finished');
    return plan;
  },
});

export const packageTourWorkflow = createWorkflow({
  id: 'packageTourWorkflow',
  description:
    'Takes a rough plan, loads flights and hotels for it deterministically, then lets an agent build the final travel plan.',
  inputSchema: roughPlanSchema,
  outputSchema: finalPlanSchema,
})
  .then(findFlightsStep)
  .then(findHotelsStep)
  .then(finalizeStep)
  .commit();
