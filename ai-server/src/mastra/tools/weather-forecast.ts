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

export interface WeatherForecast {
  city: string;
  date: string;
  condition: string;
  temperatureC: number;
}

/**
 * Pure helper, shared with the dashboard DSL compiler so the weather
 * tile does not need an LLM round-trip per booked flight.
 */
export function weatherForecast(city: string, date: string): WeatherForecast {
  const day = date.slice(0, 10);
  const seed = hashString(`${city.toLowerCase()}|${day}`);
  return {
    city,
    date: day,
    condition: pickCondition(seed),
    temperatureC: pickTemperature(seed),
  };
}

const WEATHER_ICON_BY_CONDITION: Record<string, string> = {
  Sunny: '☀️',
  'Partly cloudy': '⛅',
  Cloudy: '☁️',
  Rain: '🌧️',
  Thunder: '⛈️',
};

export function weatherIconFor(condition: string): string {
  return WEATHER_ICON_BY_CONDITION[condition] ?? '🌤️';
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
  execute: async ({ city, date }) => weatherForecast(city, date),
});
