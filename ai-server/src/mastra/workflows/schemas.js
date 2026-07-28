import { z } from 'zod';
import { hotelSchema } from '../tools/find-hotels.js';
import { flightSchema } from '../tools/search-flights.js';
export const roughPlanSchema = z.object({
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
export const legSchema = z.object({
  from: z.string(),
  to: z.string(),
  date: z.string(),
  candidates: z.array(flightSchema),
});
export const loadedDataSchema = z.object({
  legs: z.array(legSchema),
  destinations: z.array(
    z.object({
      city: z.string(),
      hotels: z.array(hotelSchema),
    }),
  ),
});
export const finalPlanSchema = z.object({
  summary: z.string().describe("Short summary in the user's language."),
  flights: z.array(flightSchema).describe('Chosen flights, in travel order.'),
  hotels: z
    .array(hotelSchema)
    .describe('Chosen hotels, one per overnight city.'),
});
