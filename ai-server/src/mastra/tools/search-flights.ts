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

function normalize(raw: RawFlight): Flight {
  return {
    id: raw.id,
    // Normalize to the canonical city spelling so flights and hotels for the
    // same city always use an identical name (the plan ties them together by
    // name). See city-aliases.ts.
    from: canonicalCity(raw.from),
    to: canonicalCity(raw.to),
    date: raw.date,
    delay: raw.delayed ? (raw.delay ?? 0) : 0,
  };
}

async function fetchFlights(from: string, to: string): Promise<Flight[]> {
  const url = `${FLIGHT_API_BASE}?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to search flights: ${response.status}`);
  }
  const raw = (await response.json()) as RawFlight[];
  return raw.map(normalize);
}

export async function searchFlights(
  from: string,
  to: string,
  date?: string,
): Promise<Flight[]> {
  // Try the given spelling first; only fall back to exonyms (e.g. Wien for
  // Vienna) when a direct lookup comes back empty. The common case stays a
  // single request.
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

  // The demo flight API cannot filter by date, so we restrict the results to
  // the requested day here in the tool. We only compare the date part and
  // ignore the time component (simplification for this workshop demo).
  const day = toDateOnly(date);
  return flights.filter((flight) => toDateOnly(flight.date) === day);
}

export const searchFlightsTool = createTool({
  id: 'searchFlights',
  description:
    'Searches for flights on the given route. Returns the list of flights (with ids, dates and delays) but does not book anything.',
  inputSchema: z.object({
    from: z.string().describe('Departure city (no code, just the city name).'),
    to: z.string().describe('Arrival city (no code, just the city name).'),
    date: z
      .string()
      .optional()
      .describe(
        'Optional ISO date without time (e.g. "2026-06-23"). If given, only ' +
          'flights on that day are returned (time component is ignored).',
      ),
  }),
  outputSchema: z.object({
    flights: z.array(flightSchema),
  }),
  execute: async ({ from, to, date }) => {
    const flights = await searchFlights(from, to, date);
    return { flights };
  },
});
