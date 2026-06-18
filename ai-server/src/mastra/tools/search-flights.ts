import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const FLIGHT_API_BASE = 'https://demo.angulararchitects.io/api/flight';

export const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

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
    from: entry.from,
    to: entry.to,
    date: entry.date,
    delay: normaliseDelay(entry),
  }));
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
  }),
  outputSchema: z.object({
    flights: z.array(flightSchema),
  }),
  execute: async ({ from, to }) => {
    const flights = await fetchFlights(from, to);
    return { flights };
  },
});
