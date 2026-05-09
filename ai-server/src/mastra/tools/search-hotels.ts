import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface HotelTemplate {
  name: string;
  stars: 3 | 4 | 5;
  basePrice: number;
  imageUrl: string;
}

// Curated, hard-coded hotel sets for the cities our demo flies to. Unknown
// cities fall back to a generic list whose ordering varies per city seed so
// the dashboard at least looks plausible.
const HOTELS_BY_CITY: Record<string, readonly HotelTemplate[]> = {
  hamburg: [
    {
      name: 'Reichshof Hamburg',
      stars: 4,
      basePrice: 159,
      imageUrl:
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600',
    },
    {
      name: 'Hotel Atlantic Kempinski',
      stars: 5,
      basePrice: 289,
      imageUrl:
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600',
    },
    {
      name: 'Motel One Alster',
      stars: 3,
      basePrice: 89,
      imageUrl:
        'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600',
    },
  ],
  london: [
    {
      name: 'The Savoy',
      stars: 5,
      basePrice: 449,
      imageUrl:
        'https://images.unsplash.com/photo-1551776235-dde6d482980b?w=600',
    },
    {
      name: 'The Hoxton Shoreditch',
      stars: 4,
      basePrice: 219,
      imageUrl:
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600',
    },
    {
      name: 'Premier Inn County Hall',
      stars: 3,
      basePrice: 119,
      imageUrl:
        'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600',
    },
  ],
  graz: [
    {
      name: 'Schloss Eggenberg Boutique',
      stars: 4,
      basePrice: 149,
      imageUrl:
        'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600',
    },
    {
      name: 'Hotel Wiesler',
      stars: 4,
      basePrice: 179,
      imageUrl:
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600',
    },
    {
      name: 'B&B Hotel Graz',
      stars: 3,
      basePrice: 79,
      imageUrl:
        'https://images.unsplash.com/photo-1551776235-dde6d482980b?w=600',
    },
  ],
};

const FALLBACK_HOTELS: readonly HotelTemplate[] = [
  {
    name: 'Grand Plaza Hotel',
    stars: 5,
    basePrice: 259,
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600',
  },
  {
    name: 'Riverside Boutique',
    stars: 4,
    basePrice: 169,
    imageUrl: 'https://images.unsplash.com/photo-1551776235-dde6d482980b?w=600',
  },
  {
    name: 'City Inn Express',
    stars: 3,
    basePrice: 89,
    imageUrl:
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600',
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
