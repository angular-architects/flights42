import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const BOOKED_FLIGHT_IDS = [1, 2, 50, 390] as const;
const FLIGHT_API_BASE = 'https://demo.angulararchitects.io/api/flight';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

type BookedFlight = z.infer<typeof flightSchema>;

interface RawFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delayed?: boolean;
  delay?: number;
}

async function fetchFlight(id: number): Promise<BookedFlight> {
  const response = await fetch(`${FLIGHT_API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load flight ${id}: ${response.status}`);
  }

  const raw = (await response.json()) as RawFlight;
  return {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delayed ? (raw.delay ?? 0) : 0,
  };
}

// Flights are loaded lazily on first access and then cached for the lifetime of the server process.
let bookedFlightsPromise: Promise<BookedFlight[]> | undefined;

async function loadBookedFlights(): Promise<BookedFlight[]> {
  if (!bookedFlightsPromise) {
    bookedFlightsPromise = Promise.all(
      BOOKED_FLIGHT_IDS.map((id) => fetchFlight(id)),
    ).catch((error) => {
      bookedFlightsPromise = undefined;
      throw error;
    });
  }

  return bookedFlightsPromise;
}

export const findBookedFlightsTool = createTool({
  id: 'findBookedFlights',
  description:
    'Returns the flights that are already booked by the current passenger.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    flights: z.array(flightSchema),
  }),
  execute: async () => ({
    flights: await loadBookedFlights(),
  }),
});
