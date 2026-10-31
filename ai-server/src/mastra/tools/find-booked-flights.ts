import { createTool, isValidationError } from '@mastra/core/tools';
import { z } from 'zod';

import {
  type BookedFlight,
  getBookedFlights,
} from '../data/booked-flights-store.js';
import { canonicalCity } from './city-aliases.js';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

const detailSchema = z.enum(['minimal', 'full']).describe(`
  "minimal" if the user only asks whether a flight is booked or wants to see
  flights: you get only the id and route of each flight. "full" if you must
  answer a question about the flights, e.g. their date or delay: you get all
  fields.
`);

const outputSchema = z.object({
  flights: z.array(flightSchema),
  detail: detailSchema,
});

type FindBookedFlightsOutput = z.infer<typeof outputSchema>;

export const findBookedFlightsTool = createTool({
  id: 'findBookedFlights',
  description: `
    Shows the flights that are already booked by the current passenger as cards
    to the user and returns them. Calling it is what displays the cards, in the
    current answer only. Pass "from" and/or "to" when the user asks about a
    specific route or city, or "flightId" when the user names a flight number;
    omit all three to show all booked flights.
  `,
  inputSchema: z.object({
    from: z
      .string()
      .optional()
      .describe('Departure city, e.g. "Graz". Omit for any departure city.'),
    to: z
      .string()
      .optional()
      .describe('Destination city, e.g. "Paris". Omit for any destination.'),
    flightId: z.coerce
      .number()
      .optional()
      .describe('Flight id, e.g. 516. Omit for any flight.'),
    detail: detailSchema,
  }),
  outputSchema,
  execute: async ({ from, to, flightId, detail }) => {
    const flights = await getBookedFlights();
    return {
      flights: flights.filter(
        (flight) =>
          sameCity(flight.from, from) &&
          sameCity(flight.to, to) &&
          (flightId === undefined || flight.id === flightId),
      ),
      detail,
    };
  },
  toModelOutput,
});

function toModelOutput(output: FindBookedFlightsOutput) {
  if (isValidationError(output)) {
    return { type: 'json', value: output };
  }
  if (output.detail === 'full') {
    return { type: 'json', value: { flights: output.flights } };
  }
  return { type: 'text', value: toShownNote(output.flights) };
}

function toShownNote(flights: BookedFlight[]): string {
  if (flights.length === 0) {
    return 'No booked flight matches. No card was shown to the user.';
  }
  const routes = flights
    .map((flight) => `#${flight.id} ${flight.from} → ${flight.to}`)
    .join(', ');
  return (
    `These booked flights were shown to the user as cards in this answer: ${routes}. ` +
    'Their dates and delays are not part of this result: never mention them. ' +
    'The cards are not visible in later answers: call findBookedFlightsTool again when asked.'
  );
}

function sameCity(city: string, filter: string | undefined): boolean {
  return (
    !filter ||
    canonicalCity(city).toLowerCase() === canonicalCity(filter).toLowerCase()
  );
}
