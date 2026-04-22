import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const HOTEL_ASSET_BASE_URL = '/assets/hotels';

export const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  sterne: z.number().int().min(1).max(5),
  imageUrl: z.string(),
  city: z.string(),
});

export type Hotel = z.infer<typeof hotelSchema>;

const baseHotels = [
  {
    id: 'biz-hotel',
    name: 'Biz Hotel',
    sterne: 3,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/biz-hotel.svg`,
  },
  {
    id: 'skyline-suites',
    name: 'Skyline Suites',
    sterne: 4,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/skyline-suites.svg`,
  },
  {
    id: 'grand-palace',
    name: 'Grand Palace',
    sterne: 5,
    imageUrl: `${HOTEL_ASSET_BASE_URL}/grand-palace.svg`,
  },
] as const;

export function findHotelsForCity(city: string): Hotel[] {
  return baseHotels.map((hotel) => ({
    ...hotel,
    name: `${hotel.name} ${city}`,
    city,
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
