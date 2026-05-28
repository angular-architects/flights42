import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { AI_SERVER_PUBLIC_URL } from './public-url.js';

interface CarModel {
  name: string;
  image: string;
}

interface CarTemplate {
  category: string;
  basePrice: number;
  models: readonly CarModel[];
}

// Three categories, three models per category. The actual model and price are
// picked deterministically per city so the same dashboard request yields the
// same listing across re-renders, but different cities still produce a bit of
// variety. Each model carries its own image so the carousel never shows a BMW
// next to "Audi A6".
//
// Image filenames point at the ai-server's local optimized webp assets
// (800×450, q=80). See `ai-server/src/mastra/public/images/cars/` and the
// `/images/:category/:filename` route registered in `mastra/index.ts`.
const CAR_TEMPLATES: readonly CarTemplate[] = [
  {
    category: 'Compact',
    basePrice: 39,
    models: [
      { name: 'VW Polo', image: 'vw-polo.webp' },
      { name: 'Opel Corsa', image: 'opel-corsa.webp' },
      { name: 'Renault Clio', image: 'renault-clio.webp' },
    ],
  },
  {
    category: 'Estate',
    basePrice: 69,
    models: [
      { name: 'Skoda Octavia', image: 'skoda-octavia.webp' },
      { name: 'VW Passat Variant', image: 'vw-passat-variant.webp' },
      { name: 'Ford Mondeo Turnier', image: 'ford-mondeo.webp' },
    ],
  },
  {
    category: 'Premium',
    basePrice: 119,
    models: [
      { name: 'BMW 5', image: 'bmw-5.webp' },
      { name: 'Mercedes E-Class', image: 'mercedes-e-class.webp' },
      { name: 'Audi A6', image: 'audi-a6.webp' },
    ],
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface RentalCar {
  id: string;
  category: string;
  model: string;
  pricePerDay: number;
  currency: 'EUR';
  imageUrl: string;
}

export interface RentalCarSearchResult {
  city: string;
  cars: RentalCar[];
}

/**
 * Pure helper, shared with the dashboard DSL compiler so we don't have
 * to invoke the tool through the LLM just to grab the same mocked list.
 */
export function searchRentalCars(city: string): RentalCarSearchResult {
  const seed = hashString(city.toLowerCase());
  const cars: RentalCar[] = CAR_TEMPLATES.map((template, index) => {
    const model = template.models[(seed + index) % template.models.length];
    return {
      id: `car-${index + 1}`,
      category: template.category,
      model: model.name,
      pricePerDay: template.basePrice + ((seed + index * 7) % 20),
      currency: 'EUR' as const,
      imageUrl: `${AI_SERVER_PUBLIC_URL}/images/cars/${model.image}`,
    };
  });
  return { city, cars };
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
  execute: async ({ city }) => searchRentalCars(city),
});
