import { canonicalCity } from '../tools/city-aliases.js';
import { toDateOnly } from '../utils/format-date.js';
export function overnightCitiesFromLegs(legs) {
  const cities = [];
  const seen = new Set();
  for (let i = 0; i < legs.length - 1; i++) {
    const arrivalDay = toDateOnly(legs[i].date);
    const nextDepartureDay = toDateOnly(legs[i + 1].date);
    if (nextDepartureDay <= arrivalDay) {
      continue;
    }
    const city = canonicalCity(legs[i].to);
    if (seen.has(city)) {
      continue;
    }
    seen.add(city);
    cities.push(city);
  }
  return cities;
}
export function createPlan(raw, legs, destinations) {
  const flights = legs
    .filter((leg) => leg.candidates.length > 0)
    .map((leg) => {
      const chosen = raw.flights.find((f) =>
        leg.candidates.some((c) => c.id === f.id),
      );
      return chosen ?? leg.candidates[0];
    });
  const hotels = destinations.map(({ hotels: options }) => {
    const chosen = options.find((h) =>
      raw.hotels.some((rh) => rh.city === h.city && rh.id === h.id),
    );
    return chosen ?? options[0];
  });
  return { summary: raw.summary, flights, hotels };
}
