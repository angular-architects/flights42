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
  sterne: z.number().int().min(1).max(5).describe('Star rating from 1 to 5'),
  imageUrl: z
    .string()
    .describe('Absolute or app-relative URL to a hotel image'),
  city: z.string().describe('City the hotel is located in'),
});

export type PlanFlight = z.infer<typeof planFlightSchema>;
export type PlanHotel = z.infer<typeof planHotelSchema>;

export interface TravelPlan {
  summary: string;
  flights: PlanFlight[];
  hotels: PlanHotel[];
  // City the trip must return to. Set once from the user's intent.
  //   string    → return there is enforced (normal case: the start city)
  //   null      → user explicitly wants a one-way / open-jaw trip → no closure
  //   undefined → legacy/default: treat as round trip (return to flights[0].from)
  homeCity?: string | null;
}
