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
  date?: string,
): Promise<Flight[]> {
  const url = `${FLIGHT_API_BASE}?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to search flights: ${response.status}`);
  }
  const raw = (await response.json()) as RawFlight[];
  const flights = raw.map(normalize);

  if (!date) {
    console.log(
      `searchFlights ${from} -> ${to}: ${flights.length} flights (no date filter)`,
    );
    return flights;
  }

  // The demo flight API cannot filter by date, so we restrict the results to
  // the requested day here in the tool. We only compare the date part and
  // ignore the time component (simplification for this workshop demo).
  const day = date.slice(0, 10);
  const filtered = flights.filter((flight) => flight.date.slice(0, 10) === day);
  console.log(
    `searchFlights ${from} -> ${to} on ${day}: ${flights.length} before filter, ${filtered.length} after`,
  );
  return filtered;
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
