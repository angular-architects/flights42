import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { toDateOnly } from '../utils/format-date.js';
import { canonicalCity, cityCandidates } from './city-aliases.js';

const FLIGHT_API_BASE = 'https://demo.angulararchitects.io/api/flight';

export const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

export type Flight = z.infer<typeof flightSchema>;

interface RawFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delayed?: boolean;
  delay?: number;
}

function normaliseDelay(raw: RawFlight): number {
  if (typeof raw.delay === 'number') {
    return raw.delay;
  }
  return raw.delayed ? 15 : 0;
}

export interface FlightRecord {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

/**
 * Fetches and normalises flights between two cities. Shared with
 * composite tools (e.g. `renderFlightChartTool`) so they don't have to
 * call `searchFlightsTool` through the LLM just to grab the same data.
 */
export async function fetchFlights(
  from: string,
  to: string,
): Promise<FlightRecord[]> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${FLIGHT_API_BASE}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `searchFlights: backend responded with status ${response.status}`,
    );
  }

  const raw = (await response.json()) as RawFlight[];
  return raw.map((entry) => ({
    id: entry.id,
    from: canonicalCity(entry.from),
    to: canonicalCity(entry.to),
    date: entry.date,
    delay: normaliseDelay(entry),
  }));
}

export async function searchFlights(
  from: string,
  to: string,
  date?: string,
): Promise<Flight[]> {
  let flights: Flight[] = [];

  for (const fromCity of cityCandidates(from)) {
    for (const toCity of cityCandidates(to)) {
      flights = await fetchFlights(fromCity, toCity);
      if (flights.length > 0) {
        break;
      }
    }
    if (flights.length > 0) {
      break;
    }
  }

  if (!date) {
    return flights;
  }

  const day = toDateOnly(date);
  return flights.filter((flight) => toDateOnly(flight.date) === day);
}

export const searchFlightsTool = createTool({
  id: 'searchFlights',
  description: [
    'Searches public flight data between two cities and returns the matching flights.',
    'For the search parameters, use city names with the first letter in upper case (e.g. "Graz", "Hamburg"). NEVER use airport codes.',
    'When the user mentions a specific day, filter the result locally by ISO date prefix (YYYY-MM-DD) on the returned flights.',
  ].join('\n'),
  inputSchema: z.object({
    from: z.string().describe('Departure city name, e.g. "Graz"'),
    to: z.string().describe('Destination city name, e.g. "Hamburg"'),
    date: z
      .string()
      .optional()
      .describe('Optional ISO date without time, e.g. "2026-06-23".'),
  }),
  outputSchema: z.object({
    flights: z.array(flightSchema),
  }),
  execute: async ({ from, to, date }) => {
    const flights = await searchFlights(from, to, date);
    return { flights };
  },
});
