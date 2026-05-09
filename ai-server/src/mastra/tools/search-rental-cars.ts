import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface CarTemplate {
  category: string;
  models: readonly string[];
  basePrice: number;
  imageUrl: string;
}

// Three categories, three models per category. The actual model and price are
// picked deterministically per city so the same dashboard request yields the
// same listing across re-renders, but different cities still produce a bit of
// variety. Images stay constant per category to keep the carousel coherent.
const CAR_TEMPLATES: readonly CarTemplate[] = [
  {
    category: 'Compact',
    models: ['VW Polo', 'Opel Corsa', 'Renault Clio'],
    basePrice: 39,
    imageUrl:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600',
  },
  {
    category: 'Estate',
    models: ['Skoda Octavia', 'VW Passat Variant', 'Ford Mondeo Turnier'],
    basePrice: 69,
    imageUrl:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600',
  },
  {
    category: 'Premium',
    models: ['BMW 5', 'Mercedes E-Class', 'Audi A6'],
    basePrice: 119,
    imageUrl:
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const searchRentalCarsTool = createTool({
  id: 'searchRentalCars',
  description: [
    'Returns a deterministic mocked list of three rental cars available in a city.',
    'Use it to populate the "Rent a car" tile of the dashboard.',
    'Output: { city, cars: { id, category, model, pricePerDay, currency, imageUrl }[] }.',
    'The list is stable per city, so re-rendering the same dashboard does not change it.',
  ].join('\n'),
  inputSchema: z.object({
    city: z.string().describe('City name, e.g. "Hamburg".'),
  }),
  outputSchema: z.object({
    city: z.string(),
    cars: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        model: z.string(),
        pricePerDay: z.number(),
        currency: z.literal('EUR'),
        imageUrl: z.string(),
      }),
    ),
  }),
  execute: async ({ city }) => {
    const seed = hashString(city.toLowerCase());
    const cars = CAR_TEMPLATES.map((template, index) => ({
      id: `car-${index + 1}`,
      category: template.category,
      model: template.models[(seed + index) % template.models.length],
      pricePerDay: template.basePrice + ((seed + index * 7) % 20),
      currency: 'EUR' as const,
      imageUrl: template.imageUrl,
    }));
    return { city, cars };
  },
});
