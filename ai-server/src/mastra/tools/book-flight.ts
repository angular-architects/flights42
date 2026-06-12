import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { USE_APPROVAL } from '../../../../feature-flags.js';
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
const paymentMethodSchema = z.enum(['creditCard', 'miles']);

const resultSchema = z.union([
  z.object({
    ok: z.literal(true),
    result: z.string(),
    flight: flightSchema,
    paymentMethod: paymentMethodSchema.optional(),
  }),
  z.object({
    ok: z.literal(false),
    result: z.string(),
    code: z.string(),
  }),
]);

const paymentSelectionSchema = z.enum(['creditCard', 'miles', 'cancel']);

// Generic option descriptor for client-rendered choice buttons.
const suspendOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()),
  variant: z.enum(['primary', 'default', 'danger']).optional(),
});

export const bookFlightTool = createTool({
  id: 'bookFlight',
  description:
    'Books a flight for the current passenger. Requires the user to choose a payment method (credit card or bonus miles) once pre-checks pass; the user may also cancel. Fails if the flight does not exist or is already booked.',
  inputSchema: z.object({
    flightId: z.number().describe('The id of the flight to book.'),
  }),
  outputSchema: resultSchema,
  suspendSchema: z.object({
    action: z.literal('book'),
    flightId: z.number(),
    flight: flightSchema,
    message: z.string(),
    options: z.array(suspendOptionSchema),
  }),
  resumeSchema: z.object({
    selection: paymentSelectionSchema,
  }),
  execute: async ({ flightId }, context) => {
    const resumeData = context?.agent?.resumeData;
    const suspend = context?.agent?.suspend;
    // const abortSignal = context?.abortSignal;

    if (resumeData?.selection === 'cancel') {
      return {
        ok: false as const,
        result: `Booking of flight ${flightId} was cancelled by the user.`,
        code: 'USER_CANCELLED',
      };
    }

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

    const selection = resumeData?.selection;
    const hasPaymentSelection =
      selection === 'creditCard' || selection === 'miles';

    if (USE_APPROVAL && !hasPaymentSelection) {
      await suspend?.({
        action: 'book',
        flightId,
        flight,
        message: `How would you like to pay for flight ${flightId} from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}?`,
        options: [
          {
            id: 'creditCard',
            label: 'Pay with credit card',
            payload: { selection: 'creditCard' },
            variant: 'default',
          },
          {
            id: 'miles',
            label: 'Pay with bonus miles',
            payload: { selection: 'miles' },
            variant: 'default',
          },
          {
            id: 'cancel',
            label: 'Cancel',
            payload: { selection: 'cancel' },
            variant: 'default',
          },
        ],
      });
      return {
        ok: false as const,
        result: 'Awaiting user approval.',
        code: 'AWAITING_APPROVAL',
      };
    }

    // await abortableDelay(6000, abortSignal);

    const paymentSuffix = hasPaymentSelection
      ? ` (paid with ${selection === 'creditCard' ? 'credit card' : 'bonus miles'})`
      : '';

    addBooking(flightId);
    return {
      ok: true as const,
      result: `Booked flight ${flightId} from ${flight.from} to ${flight.to} on ${formatFlightDate(flight.date)}${paymentSuffix}.`,
      flight,
      paymentMethod: selection,
    };
  },
});
