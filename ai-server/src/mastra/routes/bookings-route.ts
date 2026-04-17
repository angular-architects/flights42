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
    return c.json({ ok: false, error: 'Invalid flight id.' }, 400);
  }

  if (isBooked(flightId)) {
    return c.json(
      { ok: false, error: `Flight ${flightId} is already booked.` },
      409,
    );
  }

  const flight = await fetchFlight(flightId);
  if (!flight) {
    return c.json(
      { ok: false, error: `Flight ${flightId} does not exist.` },
      404,
    );
  }

  addBooking(flightId);
  return c.json({ ok: true });
}

export async function cancelFlightHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const flightId = Number(c.req.param('flightId'));
  if (!Number.isFinite(flightId)) {
    return c.json({ ok: false, error: 'Invalid flight id.' }, 400);
  }

  if (!isBooked(flightId)) {
    return c.json(
      { ok: false, error: `Flight ${flightId} is not booked.` },
      404,
    );
  }

  removeBooking(flightId);
  return c.json({ ok: true });
}
