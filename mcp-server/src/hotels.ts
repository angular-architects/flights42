import { z } from 'zod';

export const HOTELS_RESOURCE_URI = 'ui://hotels/results.html';
export const HOTEL_ASSET_BASE_URL = 'http://127.0.0.1:3002/assets/hotels';

export const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  sterne: z.number().int().min(1).max(5),
  imageUrl: z.string().url(),
});

export const findHotelsInputSchema = z.object({
  city: z.string().trim().min(1).describe('The city to search hotels for.'),
});

export const findHotelsResultSchema = z.object({
  city: z.string(),
  hotels: z.array(hotelSchema),
});

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

export type FindHotelsInput = z.infer<typeof findHotelsInputSchema>;
export type FindHotelsResult = z.infer<typeof findHotelsResultSchema>;

export function findHotels(input: FindHotelsInput): FindHotelsResult {
  return {
    city: input.city,
    hotels: baseHotels.map((hotel) => ({
      ...hotel,
      name: `${hotel.name} ${input.city}`,
    })),
  };
}
