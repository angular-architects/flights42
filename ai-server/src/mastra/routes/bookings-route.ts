import type { ContextWithMastra } from '@mastra/core/server';

import {
  addBooking,
  fetchFlight,
  getBookedFlights,
  isBooked,
  removeBooking,
} from '../data/booked-flights-store.js';

export async function listBookingsHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const flights = await getBookedFlights();
  return c.json({ flights });
}

export async function bookFlightHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const flightId = Number(c.req.param('flightId'));
  if (!Number.isFinite(flightId)) {
    return c.json(
      {
        ok: false,
        result: 'Invalid flight id.',
        code: 'NOT_FOUND',
      },
      400,
    );
  }

  if (isBooked(flightId)) {
    return c.json(
      {
        ok: false,
        result: `Flight ${flightId} is already booked.`,
        code: 'ALREADY_BOOKED',
      },
      409,
    );
  }

  const flight = await fetchFlight(flightId);
  if (!flight) {
    return c.json(
      {
        ok: false,
        result: `Flight ${flightId} does not exist.`,
        code: 'NOT_FOUND',
      },
      404,
    );
  }

  addBooking(flightId);
  return c.json({
    ok: true,
    result: `Booked flight ${flightId}.`,
    flight,
  });
}

export async function cancelFlightHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const flightId = Number(c.req.param('flightId'));
  if (!Number.isFinite(flightId)) {
    return c.json(
      {
        ok: false,
        result: 'Invalid flight id.',
        code: 'NOT_FOUND',
      },
      400,
    );
  }

  if (!isBooked(flightId)) {
    return c.json(
      {
        ok: false,
        result: `Flight ${flightId} is not booked.`,
        code: 'NOT_BOOKED',
      },
      404,
    );
  }

  const flight = await fetchFlight(flightId).catch(() => null);

  removeBooking(flightId);

  if (!flight) {
    return c.json(
      {
        ok: false,
        result: `Flight ${flightId} could not be loaded after cancellation.`,
        code: 'NOT_FOUND',
      },
      404,
    );
  }

  return c.json({
    ok: true,
    result: `Cancelled flight ${flightId}.`,
    flight,
  });
}
