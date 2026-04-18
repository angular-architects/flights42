import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  fetchFlight,
  isBooked,
  removeBooking,
} from '../data/booked-flights-store.js';
import { formatFlightDate } from '../utils/format-date.js';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

// See bookFlightTool for format rationale (Mastra-compatible `result` string
// plus additive domain data).
const resultSchema = z.union([
  z.object({
    ok: z.literal(true),
    result: z.string(),
    flight: flightSchema,
  }),
  z.object({
    ok: z.literal(false),
    result: z.string(),
    code: z.string(),
  }),
]);

export const cancelFlightTool = createTool({
  id: 'cancelFlight',
  description:
    'Cancels a previously booked flight for the current passenger. Requires explicit user approval once pre-checks pass. Fails if the flight is not booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to cancel.'),
  }),
  outputSchema: resultSchema,
  suspendSchema: z.object({
    action: z.literal('cancel'),
    flightId: z.number(),
    flight: flightSchema.nullable(),
    message: z.string(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
  }),
  execute: async ({ flightId }, context) => {
    const resumeData = context?.agent?.resumeData;
    const suspend = context?.agent?.suspend;

    if (resumeData?.approved === false) {
      return {
        ok: false as const,
        result: `Cancellation of flight ${flightId} was cancelled by the user.`,
        code: 'USER_CANCELLED',
      };
    }

    if (!isBooked(flightId)) {
      return {
        ok: false as const,
        result: `Flight ${flightId} is not booked.`,
        code: 'NOT_BOOKED',
      };
    }

    const flight = await fetchFlight(flightId).catch(() => null);

    if (resumeData?.approved !== true) {
      const flightContext = flight
        ? ` from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}`
        : '';

      await suspend?.({
        action: 'cancel',
        flightId,
        flight,
        message: `Please confirm cancellation of flight ${flightId}${flightContext}.`,
      });
      return {
        ok: false as const,
        result: 'Awaiting user approval.',
        code: 'AWAITING_APPROVAL',
      };
    }

    removeBooking(flightId);

    if (!flight) {
      return {
        ok: false as const,
        result: `Flight ${flightId} could not be loaded after cancellation.`,
        code: 'NOT_FOUND',
      };
    }

    return {
      ok: true as const,
      result: `Cancelled flight ${flightId} from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}.`,
      flight,
    };
  },
});
