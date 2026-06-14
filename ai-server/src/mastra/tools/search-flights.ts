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

// The demo flight API stores city names inconsistently (some English, some
// German — e.g. "Rome" but "Wien") and is name-sensitive, so a lookup for a
// translated spelling like "Vienna" returns nothing. Agents are told not to
// translate, but that is not reliable, so we treat these exonyms as equivalent
// and retry with the alternative spellings whenever a direct lookup is empty.
//
// Convention: list the ENGLISH exonym first in each group. Combined with
// `cityCandidates` (caller's spelling first), the lookup order becomes
// caller's spelling → English → remaining variants — and English is the best
// next guess because the API's data is mostly English.
const CITY_ALIASES: readonly (readonly string[])[] = [
  ['Vienna', 'Wien'],
  ['Rome', 'Rom'],
  ['Munich', 'München', 'Muenchen'],
  ['Prague', 'Prag'],
  ['Cologne', 'Köln', 'Koeln'],
  ['Florence', 'Florenz'],
  ['Venice', 'Venedig'],
  ['Milan', 'Mailand'],
  ['Naples', 'Neapel'],
  ['Geneva', 'Genf'],
  ['Lisbon', 'Lissabon'],
  ['Warsaw', 'Warschau'],
  ['Copenhagen', 'Kopenhagen'],
  ['Athens', 'Athen'],
  ['Brussels', 'Brüssel', 'Bruessel'],
];

/**
 * Returns the spellings to try for a city: the caller's spelling first (exact
 * match wins), then the English exonym, then any remaining variants — see the
 * "Convention" note on CITY_ALIASES.
 */
function cityCandidates(city: string): string[] {
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  const group = CITY_ALIASES.find((names) =>
    names.some((name) => name.toLowerCase() === lower),
  );
  if (!group) {
    return [trimmed];
  }
  return [trimmed, ...group.filter((name) => name.toLowerCase() !== lower)];
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
  const day = date.slice(0, 10);
  return flights.filter((flight) => flight.date.slice(0, 10) === day);
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
