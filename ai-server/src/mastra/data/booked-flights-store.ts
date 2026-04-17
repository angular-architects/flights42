const FLIGHT_API_BASE = 'https://demo.angulararchitects.io/api/flight';

export interface BookedFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

interface RawFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delayed?: boolean;
  delay?: number;
}

const bookedFlightIds = new Set<number>([1, 2, 50, 390]);

const flightCache = new Map<number, BookedFlight>();

export async function fetchFlight(id: number): Promise<BookedFlight | null> {
  if (flightCache.has(id)) {
    return flightCache.get(id)!;
  }

  const response = await fetch(`${FLIGHT_API_BASE}/${id}`);
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load flight ${id}: ${response.status}`);
  }

  const raw = (await response.json()) as RawFlight;
  const flight: BookedFlight = {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delayed ? (raw.delay ?? 0) : 0,
  };

  flightCache.set(id, flight);
  return flight;
}

export function isBooked(flightId: number): boolean {
  return bookedFlightIds.has(flightId);
}

export function addBooking(flightId: number): void {
  bookedFlightIds.add(flightId);
}

export function removeBooking(flightId: number): void {
  bookedFlightIds.delete(flightId);
}

export function getBookedFlightIds(): number[] {
  return [...bookedFlightIds];
}

export async function getBookedFlights(): Promise<BookedFlight[]> {
  const ids = getBookedFlightIds();
  const flights = await Promise.all(ids.map((id) => fetchFlight(id)));
  return flights.filter((flight): flight is BookedFlight => flight !== null);
}
