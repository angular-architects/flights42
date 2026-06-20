import type { PlanFlight, PlanHotel, TravelPlan } from './plan-schemas.js';

const normalizeCity = (city: string): string => city.trim().toLowerCase();

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Deterministically validates a travel plan against the structural rules.
 * Pure (no I/O) so it can back both the validatePlan tool and an output-processor
 * guardrail. Does NOT judge whether the plan matches the user's request.
 */
export function validatePlan(plan: TravelPlan): PlanValidationResult {
  const errors = [
    ...validateRouteConnected(plan.flights),
    ...validateTravelOrder(plan.flights),
    ...validateOneHotelPerCity(plan.hotels),
    ...validateRoundTrip(plan),
  ];
  return { valid: errors.length === 0, errors };
}

function validateRouteConnected(flights: PlanFlight[]): string[] {
  const errors: string[] = [];
  for (let i = 1; i < flights.length; i++) {
    const previous = flights[i - 1];
    const current = flights[i];
    if (normalizeCity(previous.to) !== normalizeCity(current.from)) {
      errors.push(
        `Route is not connected: flight ${i + 1} departs from ${current.from}, ` +
          `but the previous flight arrives in ${previous.to}.`,
      );
    }
  }
  return errors;
}

function validateTravelOrder(flights: PlanFlight[]): string[] {
  const errors: string[] = [];
  for (let i = 1; i < flights.length; i++) {
    if (flights[i].date < flights[i - 1].date) {
      errors.push(
        `Flights are not in travel order: flight ${i + 1} (${flights[i].date}) ` +
          `departs before flight ${i} (${flights[i - 1].date}).`,
      );
    }
  }
  return errors;
}

function validateOneHotelPerCity(hotels: PlanHotel[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const hotel of hotels) {
    const city = normalizeCity(hotel.city);
    if (seen.has(city)) {
      errors.push(`More than one hotel for ${hotel.city}.`);
    }
    seen.add(city);
  }
  return errors;
}

// The trip must return to homeCity. Intent is carried as data on the plan, so
// this stays deterministic: null opts out (one-way / open-jaw), undefined
// defaults to a round trip back to the first departure city.
function validateRoundTrip(plan: TravelPlan): string[] {
  const { flights } = plan;
  if (flights.length === 0 || plan.homeCity === null) {
    return [];
  }
  const home = plan.homeCity ?? flights[0].from;
  const last = flights[flights.length - 1];
  if (normalizeCity(last.to) !== normalizeCity(home)) {
    return [
      `Trip does not return to ${home}: the last flight arrives in ${last.to}. ` +
        `Add the missing return leg, or set homeCity to null if the user wants ` +
        `a one-way / open-jaw trip.`,
    ];
  }
  return [];
}
