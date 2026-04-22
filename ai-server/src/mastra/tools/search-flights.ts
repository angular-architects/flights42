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
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delayed ? (raw.delay ?? 0) : 0,
  };
}

export async function searchFlights(
  from: string,
  to: string,
): Promise<Flight[]> {
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

export const searchFlightsTool = createTool({
  id: 'searchFlights',
  description:
    'Searches for flights on the given route. Returns the list of flights (with ids, dates and delays) but does not book anything.',
  inputSchema: z.object({
    from: z.string().describe('Departure city (no code, just the city name).'),
    to: z.string().describe('Arrival city (no code, just the city name).'),
  }),
  outputSchema: z.object({
    flights: z.array(flightSchema),
  }),
  execute: async ({ from, to }) => {
    const flights = await searchFlights(from, to);
    return { flights };
  },
});
