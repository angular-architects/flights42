import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Rain', 'Thunder'];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickCondition(seed: number): string {
  return conditions[seed % conditions.length];
}

function pickTemperature(seed: number): number {
  return (seed % 25) + 5 - 5;
}

export const weatherForecastTool = createTool({
  id: 'weatherForecast',
  description: [
    'Returns a deterministic mocked weather forecast for a city on a specific date.',
    'Use it to enrich the booked-flights tile with a small forecast next to each booked flight.',
    'Date should be an ISO date string. Output: { city, date, condition, temperatureC }.',
  ].join('\n'),
  inputSchema: z.object({
    city: z.string().describe('City name, e.g. "Hamburg".'),
    date: z
      .string()
      .describe('ISO date or date-time. Only the YYYY-MM-DD part is used.'),
  }),
  outputSchema: z.object({
    city: z.string(),
    date: z.string(),
    condition: z.string(),
    temperatureC: z.number(),
  }),
  execute: async ({ city, date }) => {
    const day = date.slice(0, 10);
    const seed = hashString(`${city.toLowerCase()}|${day}`);
    return {
      city,
      date: day,
      condition: pickCondition(seed),
      temperatureC: pickTemperature(seed),
    };
  },
});
