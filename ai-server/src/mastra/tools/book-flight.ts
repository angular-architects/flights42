import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  addBooking,
  fetchFlight,
  isBooked,
} from '../data/booked-flights-store.js';
import { formatFlightDate } from '../utils/format-date.js';

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

// Shape mirrors Mastra's tool-result convention (`result: string`) with
// additive domain fields (`flight`, `code`), so our own returns and Mastra's
// built-in decline string normalize into the same client type.
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

export const bookFlightTool = createTool({
  id: 'bookFlight',
  description:
    'Books a flight for the current passenger. Fails if the flight does not exist or is already booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to book.'),
  }),
  outputSchema: resultSchema,
  // TODO: Add suspendSchema and resumeSchema for the approval flow
  execute: async ({ flightId }) => {
    // TODO: Read resumeData/suspend from the context and
    //       return early with code 'USER_CANCELLED' if the user declined

    if (isBooked(flightId)) {
      return {
        ok: false as const,
        result: `Flight ${flightId} is already booked.`,
        code: 'ALREADY_BOOKED',
      };
    }

    const flight = await fetchFlight(flightId);
    if (!flight) {
      return {
        ok: false as const,
        result: `Flight ${flightId} does not exist.`,
        code: 'NOT_FOUND',
      };
    }

    // TODO: If the user has not approved yet, suspend the tool
    //       and return with code 'AWAITING_APPROVAL'

    // await abortableDelay(6000, abortSignal);

    addBooking(flightId);
    return {
      ok: true as const,
      result: `Booked flight ${flightId} from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}.`,
      flight,
    };
  },
});
