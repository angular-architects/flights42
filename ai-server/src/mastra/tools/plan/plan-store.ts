import { travelPlanMemory } from './plan-memory.js';
import type { PlanFlight, PlanHotel, TravelPlan } from './plan-schemas.js';

export interface PlanToolContext {
  agent?: {
    threadId?: string;
    resourceId?: string;
  };
}

interface PlanScope {
  threadId: string;
  resourceId: string;
}

const EMPTY_PLAN: TravelPlan = { summary: '', flights: [], hotels: [] };

export async function readPlan(context: PlanToolContext): Promise<TravelPlan> {
  const { threadId, resourceId } = requireScope(context);
  const raw = await travelPlanMemory.getWorkingMemory({ threadId, resourceId });
  return parsePlan(raw);
}

export async function commitPlan(
  context: PlanToolContext,
  plan: TravelPlan,
): Promise<TravelPlan> {
  const { threadId, resourceId } = requireScope(context);
  const ordered: TravelPlan = {
    ...plan,
    hotels: orderHotelsByRoute(plan.hotels, plan.flights),
  };
  await travelPlanMemory.updateWorkingMemory({
    threadId,
    resourceId,
    workingMemory: JSON.stringify(ordered),
  });
  return ordered;
}

function requireScope(context: PlanToolContext): PlanScope {
  const threadId = context.agent?.threadId;
  const resourceId = context.agent?.resourceId;
  if (!threadId || !resourceId) {
    throw new Error(
      'Plan tools require an agent run with a thread id and a resource id',
    );
  }
  return { threadId, resourceId };
}

function parsePlan(raw: string | null): TravelPlan {
  if (!raw) {
    return EMPTY_PLAN;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isTravelPlan(value) ? value : EMPTY_PLAN;
  } catch {
    return EMPTY_PLAN;
  }
}

function isTravelPlan(value: unknown): value is TravelPlan {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as TravelPlan).flights) &&
    Array.isArray((value as TravelPlan).hotels)
  );
}

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
