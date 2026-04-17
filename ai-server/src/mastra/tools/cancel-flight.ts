import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { isBooked, removeBooking } from '../data/booked-flights-store.js';

const resultSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export const cancelFlightTool = createTool({
  id: 'cancelFlight',
  description:
    'Cancels a previously booked flight for the current passenger. Fails if the flight is not booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to cancel.'),
  }),
  outputSchema: resultSchema,
  execute: async ({ flightId }) => {
    if (!isBooked(flightId)) {
      return {
        ok: false as const,
        error: `Flight ${flightId} is not booked.`,
      };
    }

    removeBooking(flightId);
    return { ok: true as const };
  },
});
