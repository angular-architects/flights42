// The run's shared travel plan lives on the request-bound RequestContext
// (seeded by the AG-UI adapter from RunAgentInput.state); commitPlan updates
// it there and streams it back to the client via the bridge. Bridge design
// and state wiring are documented in docs/bridge.md.
import { getAgUiState, getBridge, setAgUiState } from '@internal/ag-ui-server';
import type { RequestContext } from '@mastra/core/request-context';

import type { PlanFlight, PlanHotel, TravelPlan } from './plan-schemas.js';

const EMPTY_PLAN: TravelPlan = { summary: '', flights: [], hotels: [] };

export function readPlan(
  requestContext: RequestContext | undefined,
): TravelPlan {
  const state = getAgUiState(requestContext);
  if (!isTravelPlan(state)) {
    return EMPTY_PLAN;
  }
  return state;
}

export function commitPlan(
  requestContext: RequestContext | undefined,
  plan: TravelPlan,
): TravelPlan {
  const ordered: TravelPlan = {
    ...plan,
    hotels: orderHotelsByRoute(plan.hotels, plan.flights),
  };
  setAgUiState(requestContext, ordered);
  getBridge(requestContext)?.emitStateSnapshot(ordered);
  return ordered;
}

function isTravelPlan(value: unknown): value is TravelPlan {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as TravelPlan).flights) &&
    Array.isArray((value as TravelPlan).hotels)
  );
}

// Hotels are ranked by the first flight leg that arrives in their city; hotels
// in a town that is not a flight destination keep their relative order after
// the matched ones (stable sort).
function orderHotelsByRoute(
  hotels: PlanHotel[],
  flights: PlanFlight[],
): PlanHotel[] {
  const arrivalOrder = new Map<string, number>();
  flights.forEach((flight, index) => {
    if (!arrivalOrder.has(flight.to)) {
      arrivalOrder.set(flight.to, index);
    }
  });

  const rank = (hotel: PlanHotel): number => {
    return arrivalOrder.get(hotel.city) ?? Number.MAX_SAFE_INTEGER;
  };

  return [...hotels].sort((a, b) => rank(a) - rank(b));
}
