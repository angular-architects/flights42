import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { PlanFlight, PlanHotel } from './plan-schemas.js';
import { readPlan } from './plan-store.js';

const normalizeCity = (city: string): string => city.trim().toLowerCase();

export const validatePlanTool = createTool({
  id: 'validatePlan',
  description: `
    Deterministically validates the current travel plan against the structural rules
    (connected route, flights in travel order, one hotel per city) and returns
    { valid, errors }. Call this before finishing your turn; if valid is false, fix
    the plan and validate again. This does NOT check whether the plan matches the
    user's request — judge that yourself.
  `.trim(),
  inputSchema: z.object({}),
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
  }),
  execute: async (_args, { requestContext }) => {
    const plan = readPlan(requestContext);
    const errors = [
      ...validateRouteConnected(plan.flights),
      ...validateTravelOrder(plan.flights),
      ...validateOneHotelPerCity(plan.hotels),
    ];
    return { valid: errors.length === 0, errors };
  },
});

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
