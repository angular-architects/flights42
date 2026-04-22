import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { hotelSchema } from '../tools/find-hotels.js';
import { flightSchema, searchFlights } from '../tools/search-flights.js';

const packageInputSchema = z.object({
  from: z.string().describe('Departure city (name, not IATA code).'),
  to: z.string().describe('Destination city (name, not IATA code).'),
  departDate: z
    .string()
    .describe('Planned outbound departure date (ISO 8601, e.g. 2026-05-15).'),
  returnDate: z
    .string()
    .describe('Planned return flight date (ISO 8601, e.g. 2026-05-22).'),
  minStars: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      'Minimum required hotel star rating. Typical mapping: 3 = budget, 4 = standard, 5 = premium. Values above 5 (e.g. 6 for "Superluxus"/"VIP") intentionally cannot be satisfied by the hotel catalog.',
    ),
});

const flightListSchema = z.object({
  flights: z.array(flightSchema),
});

const hotelListSchema = z.object({
  city: z.string(),
  hotels: z.array(hotelSchema),
});

function createFlightSearchStep(
  id: 'findOutboundFlights' | 'findReturnFlights',
  direction: 'outbound' | 'return',
) {
  return createStep({
    id,
    description:
      direction === 'outbound'
        ? 'Searches for flights from the origin city to the destination.'
        : 'Searches for flights from the destination back to the origin.',
    inputSchema: packageInputSchema,
    outputSchema: flightListSchema,
    execute: async ({ inputData }) => {
      const [from, to] =
        direction === 'outbound'
          ? [inputData.from, inputData.to]
          : [inputData.to, inputData.from];
      return { flights: await searchFlights(from, to) };
    },
  });
}

const findOutboundFlightsStep = createFlightSearchStep(
  'findOutboundFlights',
  'outbound',
);

const findReturnFlightsStep = createFlightSearchStep(
  'findReturnFlights',
  'return',
);

const findHotelsStep = createStep({
  id: 'findHotels',
  description:
    'Asks the hotel agent for hotel options in the destination city.',
  inputSchema: packageInputSchema,
  outputSchema: hotelListSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent('hotelAgent');
    const result = await agent.generate(
      [
        {
          role: 'user',
          content: `Find hotels in ${inputData.to}.`,
        },
      ],
      {
        structuredOutput: {
          schema: hotelListSchema,
        },
      },
    );

    if (result.object) {
      return result.object;
    }

    throw new Error('Hotel agent did not return structured hotel data.');
  },
});

const afterParallelSchema = z.object({
  findOutboundFlights: flightListSchema,
  findReturnFlights: flightListSchema,
  findHotels: hotelListSchema,
});

const afterEvaluationSchema = afterParallelSchema.extend({
  hotelMatch: hotelSchema.nullable(),
});

const packageOutputSchema = afterEvaluationSchema;

const evaluateHotelsStep = createStep({
  id: 'evaluateHotels',
  description:
    "Picks the cheapest hotel whose star rating meets the user's minStars criterion, or null if none qualifies.",
  inputSchema: afterParallelSchema,
  outputSchema: afterEvaluationSchema,
  execute: async ({ inputData, getInitData }) => {
    const init = getInitData<z.infer<typeof packageInputSchema>>();
    const candidates = [...inputData.findHotels.hotels].sort(
      (a, b) => a.sterne - b.sterne,
    );
    const match =
      candidates.find((hotel) => hotel.sterne >= init.minStars) ?? null;
    return { ...inputData, hotelMatch: match };
  },
});

const hotelMatchStateStep = createStep({
  id: 'hotelMatchState',
  description:
    'Terminal state: a hotel matching the criterion was found. Passes the accumulated result through unchanged.',
  inputSchema: afterEvaluationSchema,
  outputSchema: packageOutputSchema,
  execute: async ({ inputData }) => inputData,
});

const hotelFallbackStateStep = createStep({
  id: 'hotelFallbackState',
  description:
    'Terminal state: no hotel matches the criterion. The travel agency will arrange the hotel booking manually. Flights are still proposed.',
  inputSchema: afterEvaluationSchema,
  outputSchema: packageOutputSchema,
  execute: async ({ inputData }) => inputData,
});

const finalizeStep = createStep({
  id: 'finalize',
  description:
    'Collapses the branch result (only one of the two terminal states ran) into a single workflow output.',
  inputSchema: z.object({
    hotelMatchState: packageOutputSchema.optional(),
    hotelFallbackState: packageOutputSchema.optional(),
  }),
  outputSchema: packageOutputSchema,
  execute: async ({ inputData }) => {
    const result = inputData.hotelMatchState ?? inputData.hotelFallbackState;
    if (!result) {
      throw new Error('Package tour workflow ended without a terminal state.');
    }
    return result;
  },
});

export const packageTourWorkflow = createWorkflow({
  id: 'packageTourWorkflow',
  description:
    'Proposes a package tour: searches outbound flights, return flights, and hotels in parallel, then branches based on whether a hotel matches the requested minimum star rating.',
  inputSchema: packageInputSchema,
  outputSchema: packageOutputSchema,
})
  .parallel([findOutboundFlightsStep, findReturnFlightsStep, findHotelsStep])
  .then(evaluateHotelsStep)
  .branch([
    [
      async ({ inputData }) => inputData.hotelMatch !== null,
      hotelMatchStateStep,
    ],
    [
      async ({ inputData }) => inputData.hotelMatch === null,
      hotelFallbackStateStep,
    ],
  ])
  .then(finalizeStep)
  .commit();
