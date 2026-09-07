import { z } from 'zod';

export const planFlightSchema = z.object({
  id: z.number().describe('The flight id'),
  from: z.string().describe('Departure city (city name, no code)'),
  to: z.string().describe('Arrival city (city name, no code)'),
  date: z.string().describe('Departure date in ISO format'),
  delay: z.number().describe('Delay in minutes (0 if on time)'),
});

export const planHotelSchema = z.object({
  id: z.string().describe('Stable hotel id (e.g. "grand-palace")'),
  name: z.string().describe('Full hotel name including the city'),
  stars: z.number().int().min(1).max(5).describe('Star rating from 1 to 5'),
  imageUrl: z
    .string()
    .describe('Absolute or app-relative URL to a hotel image'),
  city: z.string().describe('City the hotel is located in'),
});

export const travelPlanSchema = z.object({
  summary: z.string().describe('Short summary of the trip'),
  flights: z
    .array(planFlightSchema)
    .describe('The complete list of flights, in travel order'),
  hotels: z
    .array(planHotelSchema)
    .describe('The complete list of hotels, one per overnight city'),
});

export type PlanFlight = z.infer<typeof planFlightSchema>;
export type PlanHotel = z.infer<typeof planHotelSchema>;
export type TravelPlan = z.infer<typeof travelPlanSchema>;
