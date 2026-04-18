import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  fetchFlight,
  isBooked,
  removeBooking,
} from '../data/booked-flights-store.js';
import { formatFlightDate } from '../utils/format-date.js';

const resultSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const suspendSchema = z.object({
  action: z.literal('cancel'),
  flightId: z.number(),
  flight: z
    .object({
      id: z.number(),
      from: z.string(),
      to: z.string(),
      date: z.string(),
      delay: z.number(),
    })
    .nullable(),
  message: z.string(),
});

const resumeSchema = z.object({
  approved: z.boolean(),
});

export const cancelFlightTool = createTool({
  id: 'cancelFlight',
  description:
    'Cancels a previously booked flight for the current passenger. Requires explicit user approval once pre-checks pass. Fails if the flight is not booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to cancel.'),
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
        error: `Cancellation of flight ${flightId} was rejected by the user.`,
      };
    }

    if (!isBooked(flightId)) {
      return {
        ok: false as const,
        error: `Flight ${flightId} is not booked.`,
      };
    }

    if (resumeData?.approved !== true) {
      const flight = await fetchFlight(flightId).catch(() => null);
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
        error: 'Awaiting user approval.',
      };
    }

    removeBooking(flightId);
    return { ok: true as const };
  },
});
