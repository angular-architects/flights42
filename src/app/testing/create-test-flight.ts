import { Flight } from '../domains/ticketing/data/flight';

export function createTestFlight(
  id: number,
  from = 'Paris',
  to = 'London',
): Flight {
  return {
    id,
    from,
    to,
    date: new Date().toISOString(),
    delayed: false,
  };
}
