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
    'Cancels a previously booked flight for the current passenger. Fails if the flight is not booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to cancel.'),
  }),
  outputSchema: resultSchema,
  // TODO: Add suspendSchema and resumeSchema for the approval flow
  execute: async ({ flightId }) => {
    // TODO: Read resumeData/suspend from the context and
    //       return early with code 'USER_CANCELLED' if the user declined

    if (!isBooked(flightId)) {
      return {
        ok: false as const,
        result: `Flight ${flightId} is not booked.`,
        code: 'NOT_BOOKED',
      };
    }

    const flight = await fetchFlight(flightId).catch(() => null);

    // TODO: If the user has not approved yet, suspend the tool
    //       and return with code 'AWAITING_APPROVAL'

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
