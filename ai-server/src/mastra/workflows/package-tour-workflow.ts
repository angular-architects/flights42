import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { readBridge } from '../../../../libs/ag-ui-server/step-bridge.js';
import { findHotelsForCity, hotelSchema } from '../tools/find-hotels.js';
import { flightSchema, searchFlights } from '../tools/search-flights.js';
import { planFinalizerAgent } from './plan-finalizer-agent.js';

const roughPlanSchema = z.object({
  userPrompt: z.string().describe('The original user request, verbatim.'),
  hotels: z
    .array(z.object({ city: z.string() }))
    .describe('Cities the traveller wants to stay in.'),
  flights: z
    .array(
      z.object({
        from: z.string().describe('Departure city (name, not IATA code).'),
        to: z.string().describe('Destination city (name, not IATA code).'),
        date: z
          .string()
          .describe(
            'Departure day as ISO date without time, e.g. "2026-06-23".',
          ),
      }),
    )
    .describe('Flight legs in travel order.'),
});

const legSchema = z.object({
  from: z.string(),
  to: z.string(),
  date: z.string(),
  candidates: z.array(flightSchema),
});

const loadedDataSchema = z.object({
  legs: z.array(legSchema),
  destinations: z.array(
    z.object({
      city: z.string(),
      hotels: z.array(hotelSchema),
    }),
  ),
});

const finalPlanSchema = z.object({
  summary: z.string().describe("Short summary in the user's language."),
  flights: z.array(flightSchema).describe('Chosen flights, in travel order.'),
  hotels: z
    .array(hotelSchema)
    .describe('Chosen hotels, one per overnight city.'),
});

interface StepProgressContext {
  writer?: { write: (chunk: unknown) => Promise<void> };
  requestContext?: Parameters<typeof readBridge>[0];
  stepName?: string;
}

async function emitStepStatus(
  ctx: StepProgressContext,
  stepName: string,
  status: 'started' | 'finished',
  extras?: Record<string, unknown>,
): Promise<void> {
  const bridge = readBridge(ctx.requestContext);
  bridge?.emit({ stepName, kind: status, details: extras });

  await ctx.writer?.write({
    type: 'data-step-status',
    stepName,
    status,
    ...(extras ?? {}),
  });
}

async function withToolCall<T>(
  ctx: StepProgressContext,
  toolName: string,
  args: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const bridge = readBridge(ctx.requestContext);
  const result = await run();
  bridge?.emitToolCall({
    toolName,
    args,
    result,
    stepName: ctx.stepName,
  });
  return result;
}

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
    await emitStepStatus(ctx, 'findFlights', 'started');

    const legs = await Promise.all(
      inputData.flights.map(async (leg) => {
        const candidates = await withToolCall(
          ctx,
          'searchFlights',
          { from: leg.from, to: leg.to, date: leg.date },
          () => searchFlights(leg.from, leg.to, leg.date),
        );
        return { from: leg.from, to: leg.to, date: leg.date, candidates };
      }),
    );

    await emitStepStatus(ctx, 'findFlights', 'finished', {
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
  execute: async ({ inputData, getInitData, writer, requestContext }) => {
    const ctx: StepProgressContext = {
      writer,
      requestContext,
      stepName: 'findHotels',
    };
    await emitStepStatus(ctx, 'findHotels', 'started');

    const init = getInitData<z.infer<typeof roughPlanSchema>>();

    const destinations = await Promise.all(
      init.hotels.map(({ city }) =>
        withToolCall(ctx, 'findHotels', { city }, async () => ({
          city,
          hotels: findHotelsForCity(city),
        })),
      ),
    );

    await emitStepStatus(ctx, 'findHotels', 'finished', {
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
    await emitStepStatus(ctx, 'finalize', 'started');

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

    const plan = result.object ?? { summary: '', flights: [], hotels: [] };

    await emitStepStatus(ctx, 'finalize', 'finished');
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
