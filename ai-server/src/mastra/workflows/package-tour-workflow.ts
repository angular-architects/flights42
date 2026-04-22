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

export const packageTourWorkflow = createWorkflow({
  id: 'packageTourWorkflow',
  description:
    'Proposes a package tour (outbound flight, return flight, hotel) in parallel.',
  inputSchema: packageInputSchema,
  outputSchema: z.object({
    findOutboundFlights: flightListSchema,
    findReturnFlights: flightListSchema,
    findHotels: hotelListSchema,
  }),
})
  .parallel([findOutboundFlightsStep, findReturnFlightsStep, findHotelsStep])
  .commit();
