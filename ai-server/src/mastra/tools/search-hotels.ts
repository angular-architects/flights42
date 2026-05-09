import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { AI_SERVER_PUBLIC_URL } from './public-url.js';

interface HotelTemplate {
  name: string;
  stars: 3 | 4 | 5;
  basePrice: number;
  imageUrl: string;
}

// Image URLs point at the ai-server's local optimized webp assets
// (800×450, q=80). See `ai-server/public/images/hotels/` and the
// `/images/:category/:filename` route registered in `mastra/index.ts`.
const HOTEL_IMG_LOBBY = `${AI_SERVER_PUBLIC_URL}/images/hotels/hotel-lobby.webp`;
const HOTEL_IMG_LUXURY = `${AI_SERVER_PUBLIC_URL}/images/hotels/hotel-luxury.webp`;
const HOTEL_IMG_EXTERIOR = `${AI_SERVER_PUBLIC_URL}/images/hotels/hotel-exterior.webp`;
const HOTEL_IMG_INTERIOR = `${AI_SERVER_PUBLIC_URL}/images/hotels/hotel-interior.webp`;

// Curated, hard-coded hotel sets for the cities our demo flies to. Unknown
// cities fall back to a generic list whose ordering varies per city seed so
// the dashboard at least looks plausible.
const HOTELS_BY_CITY: Record<string, readonly HotelTemplate[]> = {
  hamburg: [
    {
      name: 'Hafenpark Hamburg',
      stars: 4,
      basePrice: 159,
      imageUrl: HOTEL_IMG_LOBBY,
    },
    {
      name: 'Hotel Atlantic Kempinski',
      stars: 5,
      basePrice: 289,
      imageUrl: HOTEL_IMG_LUXURY,
    },
    {
      name: 'Motel One Alster',
      stars: 3,
      basePrice: 89,
      imageUrl: HOTEL_IMG_EXTERIOR,
    },
  ],
  london: [
    {
      name: 'The Savoy',
      stars: 5,
      basePrice: 449,
      imageUrl: HOTEL_IMG_INTERIOR,
    },
    {
      name: 'The Hoxton Shoreditch',
      stars: 4,
      basePrice: 219,
      imageUrl: HOTEL_IMG_LOBBY,
    },
    {
      name: 'Premier Inn County Hall',
      stars: 3,
      basePrice: 119,
      imageUrl: HOTEL_IMG_EXTERIOR,
    },
  ],
  graz: [
    {
      name: 'Schloss Eggenberg Boutique',
      stars: 4,
      basePrice: 149,
      imageUrl: HOTEL_IMG_EXTERIOR,
    },
    {
      name: 'Hotel Wiesler',
      stars: 4,
      basePrice: 179,
      imageUrl: HOTEL_IMG_LOBBY,
    },
    {
      name: 'B&B Hotel Graz',
      stars: 3,
      basePrice: 79,
      imageUrl: HOTEL_IMG_INTERIOR,
    },
  ],
};

const FALLBACK_HOTELS: readonly HotelTemplate[] = [
  {
    name: 'Grand Plaza Hotel',
    stars: 5,
    basePrice: 259,
    imageUrl: HOTEL_IMG_LOBBY,
  },
  {
    name: 'Riverside Boutique',
    stars: 4,
    basePrice: 169,
    imageUrl: HOTEL_IMG_INTERIOR,
  },
  {
    name: 'City Inn Express',
    stars: 3,
    basePrice: 89,
    imageUrl: HOTEL_IMG_EXTERIOR,
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) {
    return [];
  }
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

export const searchHotelsTool = createTool({
  id: 'searchHotels',
  description: [
    'Returns a deterministic mocked list of three hotels for a city.',
    'Use it to populate the "Hotels" tile of the dashboard.',
    'Output: { city, hotels: { id, name, stars, pricePerNight, currency, imageUrl }[] }.',
    'The list is stable per city, so re-rendering the same dashboard does not change it.',
    'Date inputs are accepted but ignored — pricing is independent of stay length in this mock.',
  ].join('\n'),
  inputSchema: z.object({
    city: z.string().describe('City name, e.g. "Hamburg".'),
    checkIn: z
      .string()
      .optional()
      .describe('Optional ISO date. Currently ignored by the mock.'),
    checkOut: z
      .string()
      .optional()
      .describe('Optional ISO date. Currently ignored by the mock.'),
  }),
  outputSchema: z.object({
    city: z.string(),
    hotels: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        stars: z.number(),
        pricePerNight: z.number(),
        currency: z.literal('EUR'),
        imageUrl: z.string(),
      }),
    ),
  }),
  execute: async ({ city }) => {
    const key = city.toLowerCase().trim();
    const seed = hashString(key);
    const known = HOTELS_BY_CITY[key];
    const list = known ?? rotate(FALLBACK_HOTELS, seed);

    const hotels = list.map((hotel, index) => ({
      id: `hotel-${index + 1}`,
      name: hotel.name,
      stars: hotel.stars,
      pricePerNight: hotel.basePrice + ((seed + index * 11) % 25),
      currency: 'EUR' as const,
      imageUrl: hotel.imageUrl,
    }));

    return { city, hotels };
  },
});
