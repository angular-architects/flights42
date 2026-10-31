const FLIGHT_API = 'https://demo.angulararchitects.io/api/flight';

export interface Flight {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

export interface Hotel {
  id: string;
  name: string;
  stars: number;
  imageUrl: string;
  city: string;
}

const flightsById = new Map<number, Flight>();

export async function loadFlights(from: string, to: string): Promise<Flight[]> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${FLIGHT_API}?${params.toString()}`);
  const raw = (await response.json()) as (Flight & { delayed?: boolean })[];
  const flights = raw.map((flight) => ({
    id: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date,
    delay: flight.delay ?? (flight.delayed ? 15 : 0),
  }));
  for (const flight of flights) {
    flightsById.set(flight.id, flight);
  }
  return flights;
}

export async function loadFlight(id: number): Promise<Flight | undefined> {
  const cached = flightsById.get(id);
  if (cached) {
    return cached;
  }
  const response = await fetch(`${FLIGHT_API}/${id}`);
  if (!response.ok) {
    return undefined;
  }
  const flight = (await response.json()) as Flight;
  flightsById.set(id, flight);
  return flight;
}

const HOTEL_TEMPLATES = [
  { id: 'budget-hotel', name: 'Budget Hotel', stars: 3, image: 'biz-hotel' },
  { id: 'biz-hotel', name: 'Biz Hotel', stars: 4, image: 'skyline-suites' },
  { id: 'grand-palace', name: 'Grand Palace', stars: 5, image: 'grand-palace' },
];

export function hotelsFor(city: string): Hotel[] {
  return HOTEL_TEMPLATES.map((hotel) => ({
    id: `${hotel.id}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `${hotel.name} ${city}`,
    stars: hotel.stars,
    imageUrl: `/assets/hotels/${hotel.image}.svg`,
    city,
  }));
}

export function hotelFor(city: string, stars: number): Hotel {
  return hotelsFor(city).find((hotel) => hotel.stars === stars)!;
}

export function isoDay(date: string): string {
  return date.slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function localDay(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
