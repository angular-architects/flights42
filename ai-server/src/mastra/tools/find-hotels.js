import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { canonicalCity } from './city-aliases.js';
const HOTEL_ASSET_BASE_URL = '/assets/hotels';
export const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  sterne: z.number().int().min(1).max(5),
  imageUrl: z.string(),
  city: z.string(),
});
const baseHotels = [
  {
    id: 'budget-hotel',
    name: 'Budget Hotel',
    sterne: 3,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/biz-hotel.svg`,
  },
  {
    id: 'biz-hotel',
    name: 'Biz Hotel',
    sterne: 4,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/skyline-suites.svg`,
  },
  {
    id: 'grand-palace',
    name: 'Grand Palace',
    sterne: 5,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/grand-palace.svg`,
  },
];
export function findHotelsForCity(city) {
  // Normalize to the canonical spelling so the hotel's city matches the flight
  // data (e.g. "Vienna" → "Wien"). This keeps the plan consistent and makes a
  // duplicate lookup with a different spelling idempotent. See city-aliases.ts.
  const canonical = canonicalCity(city);
  return baseHotels.map((hotel) => ({
    ...hotel,
    name: `${hotel.name} ${canonical}`,
    city: canonical,
  }));
}
export const findHotelsTool = createTool({
  id: 'findHotels',
  description:
    'Returns three hotel options for the given city. Each hotel has a different star rating (3, 4 and 5 stars).',
  inputSchema: z.object({
    city: z.string().trim().min(1).describe('The city to search hotels for.'),
  }),
  outputSchema: z.object({
    city: z.string(),
    hotels: z.array(hotelSchema),
  }),
  execute: async ({ city }) => {
    return {
      city,
      hotels: findHotelsForCity(city),
    };
  },
});
