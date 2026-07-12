import type { ContextWithMastra } from '@mastra/core/server';

import { searchFlights } from '../tools/search-flights.js';

export async function searchFlightsHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) {
    return c.json(
      {
        error: 'invalid_request',
        message: 'Query parameters "from" and "to" are required',
      },
      400,
    );
  }

  const flights = await searchFlights(from, to);
  return c.json({ flights });
}
