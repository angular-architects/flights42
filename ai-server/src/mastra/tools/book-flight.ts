import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  addBooking,
  fetchFlight,
  isBooked,
} from '../data/booked-flights-store.js';
import { formatFlightDate } from '../utils/format-date.js';

const resultSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const suspendSchema = z.object({
  action: z.literal('book'),
  flightId: z.number(),
  flight: z.object({
    id: z.number(),
    from: z.string(),
    to: z.string(),
    date: z.string(),
    delay: z.number(),
  }),
  message: z.string(),
});

const resumeSchema = z.object({
  approved: z.boolean(),
});

export const bookFlightTool = createTool({
  id: 'bookFlight',
  description:
    'Books a flight for the current passenger. Requires explicit user approval once pre-checks pass. Fails if the flight does not exist or is already booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to book.'),
  }),
  outputSchema: resultSchema,
  suspendSchema,
  resumeSchema,
  execute: async ({ flightId }, context) => {
    const resumeData = context?.agent?.resumeData;
    const suspend = context?.agent?.suspend;

    if (resumeData?.approved === false) {
      return {
        ok: false as const,
        error: `Booking of flight ${flightId} was rejected by the user.`,
      };
    }

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

    if (resumeData?.approved !== true) {
      await suspend?.({
        action: 'book',
        flightId,
        flight,
        message: `Please confirm booking of flight ${flightId} from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}.`,
      });
      return {
        ok: false as const,
        error: 'Awaiting user approval.',
      };
    }

    addBooking(flightId);
    return { ok: true as const };
  },
});
