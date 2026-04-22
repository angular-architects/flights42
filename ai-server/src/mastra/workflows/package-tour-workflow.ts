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

const findOutboundFlightsStep = createStep({
  id: 'findOutboundFlights',
  description: 'Searches for flights from the origin city to the destination.',
  inputSchema: packageInputSchema,
  outputSchema: flightListSchema,
  execute: async ({ inputData }) => {
    const flights = await searchFlights(inputData.from, inputData.to);
    return { flights };
  },
});

const findReturnFlightsStep = createStep({
  id: 'findReturnFlights',
  description: 'Searches for flights from the destination back to the origin.',
  inputSchema: packageInputSchema,
  outputSchema: flightListSchema,
  execute: async ({ inputData }) => {
    const flights = await searchFlights(inputData.to, inputData.from);
    return { flights };
  },
});

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
