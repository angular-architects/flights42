import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  addBooking,
  fetchFlight,
  isBooked,
} from '../data/booked-flights-store.js';

const resultSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export const bookFlightTool = createTool({
  id: 'bookFlight',
  description:
    'Books a flight for the current passenger. Fails if the flight does not exist or is already booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to book.'),
  }),
  outputSchema: resultSchema,
  execute: async ({ flightId }) => {
    if (isBooked(flightId)) {
      return {
        ok: false as const,
        error: `Flight ${flightId} is already booked.`,
      };
    }

    const flight = await fetchFlight(flightId);
    if (!flight) {
      return {
        ok: false as const,
        error: `Flight ${flightId} does not exist.`,
      };
    }

    addBooking(flightId);
    return { ok: true as const };
  },
});
