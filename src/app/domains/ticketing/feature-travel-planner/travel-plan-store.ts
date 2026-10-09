import { computed, Injectable } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';
import { z } from 'zod';

import { FlightInfo } from '../data/flight-info';
import { HotelInfo } from '../data/hotel-info';
import { TRAVEL_REFINEMENT_AGENT_ID } from './travel-refinement-agent-store';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string().refine((date) => !Number.isNaN(Date.parse(date))),
  delay: z.number(),
});

const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  stars: z.number(),
  imageUrl: z.string(),
  city: z.string(),
});

const travelPlanSchema = z.object({
  summary: z.string(),
  flights: z.array(flightSchema),
  hotels: z.array(hotelSchema),
});

export type TravelPlan = z.infer<typeof travelPlanSchema>;

const EMPTY_PLAN: TravelPlan = { summary: '', flights: [], hotels: [] };

@Injectable({ providedIn: 'root' })
export class TravelPlanStore {
  private readonly agentStore = injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);

  public readonly plan = computed<TravelPlan>(() => {
    const result = travelPlanSchema.safeParse(this.agentStore().state());
    return result.success ? result.data : EMPTY_PLAN;
  });

  public readonly summary = computed(() => this.plan().summary);
  public readonly flights = computed(() => this.plan().flights);
  public readonly hotels = computed(() => this.plan().hotels);

  public setPlan(plan: TravelPlan): void {
    this.agentStore().agent.setState({
      summary: plan.summary,
      flights: plan.flights,
      hotels: orderHotelsByRoute(plan.hotels, plan.flights),
    });
  }

  public addFlight(flight: FlightInfo): void {
    const flights = upsertById(this.flights(), flight);
    this.agentStore().agent.setState({
      ...this.plan(),
      flights,
      hotels: orderHotelsByRoute(this.hotels(), flights),
    });
  }

  public removeFlight(flightId: number): void {
    const flights = this.flights().filter((flight) => flight.id !== flightId);
    this.agentStore().agent.setState({
      ...this.plan(),
      flights,
      hotels: orderHotelsByRoute(this.hotels(), flights),
    });
  }

  public replaceFlight(oldFlightId: number, flight: FlightInfo): void {
    const flights = this.flights().map((current) =>
      current.id === oldFlightId ? flight : current,
    );
    this.agentStore().agent.setState({
      ...this.plan(),
      flights,
      hotels: orderHotelsByRoute(this.hotels(), flights),
    });
  }

  public addHotel(hotel: HotelInfo): void {
    // The plan holds at most one hotel per overnight city, so adding a hotel
    // for a city that already has one replaces it instead of duplicating.
    this.agentStore().agent.setState({
      ...this.plan(),
      hotels: orderHotelsByRoute(
        [
          ...this.hotels().filter((current) => current.city !== hotel.city),
          hotel,
        ],
        this.flights(),
      ),
    });
  }

  public removeHotel(hotelId: string): void {
    this.agentStore().agent.setState({
      ...this.plan(),
      hotels: this.hotels().filter((hotel) => hotel.id !== hotelId),
    });
  }

  public clear(): void {
    this.agentStore().agent.setState(EMPTY_PLAN);
  }
}

function upsertById<T extends { id: number | string }>(
  items: T[],
  item: T,
): T[] {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) {
    return [...items, item];
  }
  const next = [...items];
  next[index] = item;
  return next;
}

/**
 * Orders hotels to match the city sequence of the itinerary: a hotel is ranked by
 * the first flight leg that arrives in its city. Hotels in a town that is not a
 * flight destination (e.g. staying outside the city) keep their relative order
 * after the matched ones (the sort is stable).
 */
function orderHotelsByRoute(
  hotels: HotelInfo[],
  flights: FlightInfo[],
): HotelInfo[] {
  const arrivalOrder = new Map<string, number>();
  flights.forEach((flight, index) => {
    if (!arrivalOrder.has(flight.to)) {
      arrivalOrder.set(flight.to, index);
    }
  });

  const rank = (hotel: HotelInfo): number =>
    arrivalOrder.get(hotel.city) ?? Number.MAX_SAFE_INTEGER;

  return [...hotels].sort((a, b) => rank(a) - rank(b));
}
