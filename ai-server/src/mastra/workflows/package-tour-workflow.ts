import type { ToolStream } from '@mastra/core/tools';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { findHotelsForCity } from '../tools/find-hotels.js';
import { searchFlights } from '../tools/search-flights.js';
import { planFinalizerAgent } from './plan-finalizer-agent.js';
import {
  finalPlanSchema,
  legSchema,
  loadedDataSchema,
  roughPlanSchema,
} from './schemas.js';
import { createPlan, overnightCitiesFromLegs } from './utils.js';

export const SERVICE_CALL_CHUNK_TYPE = 'data-service-call';

export interface ServiceCallChunk {
  step: string;
  tool: string;
  args: unknown;
  result: unknown;
}

async function reportServiceCall(
  writer: ToolStream | undefined,
  call: ServiceCallChunk,
): Promise<void> {
  await writer?.custom({ type: SERVICE_CALL_CHUNK_TYPE, data: call });
}

const findFlightsStep = createStep({
  id: 'findFlights',
  description:
    'Loads flight candidates for every leg of the rough plan, restricted to the planned day.',
  inputSchema: roughPlanSchema,
  outputSchema: z.object({ legs: z.array(legSchema) }),
  execute: async ({ inputData, writer }) => {
    const legs = await Promise.all(
      inputData.flights.map(async (leg) => {
        const candidates = await searchFlights(leg.from, leg.to, leg.date);
        await reportServiceCall(writer, {
          step: 'findFlights',
          tool: 'searchFlights',
          args: { from: leg.from, to: leg.to, date: leg.date },
          result: candidates,
        });
        return { from: leg.from, to: leg.to, date: leg.date, candidates };
      }),
    );

    return { legs };
  },
});

const findHotelsStep = createStep({
  id: 'findHotels',
  description:
    'Loads hotel options for every city of the rough plan (deterministic, no agent).',
  inputSchema: z.object({ legs: z.array(legSchema) }),
  outputSchema: loadedDataSchema,
  execute: async ({ inputData, writer }) => {
    const overnightCities = overnightCitiesFromLegs(inputData.legs);

    const destinations = [];
    for (const city of overnightCities) {
      const hotels = findHotelsForCity(city);
      await reportServiceCall(writer, {
        step: 'findHotels',
        tool: 'findHotels',
        args: { city },
        result: { city, hotels },
      });
      destinations.push({ city, hotels });
    }

    return { legs: inputData.legs, destinations };
  },
});

const finalizeStep = createStep({
  id: 'finalize',
  description:
    'Lets an agent pick the concrete flights and hotels and build the final plan.',
  inputSchema: loadedDataSchema,
  outputSchema: finalPlanSchema,
  execute: async ({ inputData, getInitData }) => {
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
    return createPlan(raw, inputData.legs, inputData.destinations);
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
