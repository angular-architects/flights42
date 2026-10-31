import { fetchFlight } from '../../data/booked-flights-store.js';
import { canonicalCity } from '../city-aliases.js';
import { findHotelsForCity } from '../find-hotels.js';
import type { PlanFlight, PlanHotel } from './plan-schemas.js';

export async function lookUpFlight(id: number): Promise<PlanFlight> {
  const flight = await fetchFlight(id);
  if (!flight) {
    throw new Error(
      `The plan was not changed: flight ${id} does not exist. Use an id from a searchFlights result.`,
    );
  }
  return {
    ...flight,
    from: canonicalCity(flight.from),
    to: canonicalCity(flight.to),
  };
}

const DEFAULT_STARS = 4;

export function lookUpHotel(city: string, stars = DEFAULT_STARS): PlanHotel {
  const hotels = findHotelsForCity(city);
  const hotel = hotels.find((candidate) => candidate.stars === stars);
  if (!hotel) {
    const available = hotels.map((candidate) => candidate.stars).join(', ');
    throw new Error(
      `The plan was not changed: there is no ${stars}-star hotel in ${city}. Available stars: ${available}.`,
    );
  }
  return hotel;
}

export function sameCity(a: string, b: string): boolean {
  return canonicalCity(a).toLowerCase() === canonicalCity(b).toLowerCase();
}
