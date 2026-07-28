// The run's shared travel-plan state lives on the request-bound AG-UI bridge:
// readPlan/getState, commitPlan/setState, and emitStateSnapshot streams it back
// to the client. Bridge design and state wiring are documented in docs/bridge.md.
import { readBridge } from '@internal/ag-ui-server';
const EMPTY_PLAN = { summary: '', flights: [], hotels: [] };
export function readPlan(requestContext) {
  const state = readBridge(requestContext)?.getState();
  if (!isTravelPlan(state)) {
    return EMPTY_PLAN;
  }
  return state;
}
export function commitPlan(requestContext, plan) {
  const ordered = {
    ...plan,
    hotels: orderHotelsByRoute(plan.hotels, plan.flights),
  };
  const bridge = readBridge(requestContext);
  bridge?.setState(ordered);
  bridge?.emitStateSnapshot(ordered);
  return ordered;
}
function isTravelPlan(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value.flights) &&
    Array.isArray(value.hotels)
  );
}
// Hotels are ranked by the first flight leg that arrives in their city; hotels
// in a town that is not a flight destination keep their relative order after
// the matched ones (stable sort).
function orderHotelsByRoute(hotels, flights) {
  const arrivalOrder = new Map();
  flights.forEach((flight, index) => {
    if (!arrivalOrder.has(flight.to)) {
      arrivalOrder.set(flight.to, index);
    }
  });
  const rank = (hotel) => {
    return arrivalOrder.get(hotel.city) ?? Number.MAX_SAFE_INTEGER;
  };
  return [...hotels].sort((a, b) => rank(a) - rank(b));
}
