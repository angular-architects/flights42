import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  addBooking,
  fetchFlight,
  isBooked,
} from '../data/booked-flights-store.js';
import { formatFlightDate } from '../utils/format-date.js';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

const resultSchema = z.union([
  z.object({ ok: z.literal(true), flight: flightSchema }),
  z.object({
    ok: z.literal(false),
    code: z.string(),
    message: z.string(),
  }),
]);

const suspendSchema = z.object({
  action: z.literal('book'),
  flightId: z.number(),
  flight: flightSchema,
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
        code: 'USER_CANCELLED',
        message: `Booking of flight ${flightId} was cancelled by the user.`,
      };
    }

    if (isBooked(flightId)) {
      return {
        ok: false as const,
        code: 'ALREADY_BOOKED',
        message: `Flight ${flightId} is already booked.`,
      };
    }

    const flight = await fetchFlight(flightId);
    if (!flight) {
      return {
        ok: false as const,
        code: 'NOT_FOUND',
        message: `Flight ${flightId} does not exist.`,
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
        code: 'AWAITING_APPROVAL',
        message: 'Awaiting user approval.',
      };
    }

    addBooking(flightId);
    return { ok: true as const, flight };
  },
});
