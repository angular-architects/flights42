// The run's shared travel-plan state lives on the request-bound AG-UI bridge:
// readPlan/getState, commitPlan/setState, and emitStateSnapshot streams it back
// to the client. Bridge design and state wiring are documented in docs/bridge.md.
import { readBridge } from '@internal/ag-ui-server';
import type { RequestContext } from '@mastra/core/request-context';

import type { PlanFlight, PlanHotel, TravelPlan } from './plan-schemas.js';

const EMPTY_PLAN: TravelPlan = { summary: '', flights: [], hotels: [] };

export function readPlan(
  requestContext: RequestContext | undefined,
): TravelPlan {
  const state = readBridge(requestContext)?.getState();
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
  const bridge = readBridge(requestContext);
  bridge?.setState(ordered);
  bridge?.emitStateSnapshot(ordered);
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
