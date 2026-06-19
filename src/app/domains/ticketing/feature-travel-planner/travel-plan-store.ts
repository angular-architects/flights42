import { computed } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

import { FlightInfo } from '../data/flight-info';

export interface PlanHotel {
  id: string;
  name: string;
  sterne: number;
  imageUrl: string;
  city: string;
}

export interface TravelPlan {
  summary: string;
  flights: FlightInfo[];
  hotels: PlanHotel[];
}

export const TravelPlanStore = signalStore(
  { providedIn: 'root' },

  withState<TravelPlan>({
    summary: '',
    flights: [],
    hotels: [],
  }),

  withComputed((store) => ({
    plan: computed<TravelPlan>(() => ({
      summary: store.summary(),
      flights: store.flights(),
      hotels: store.hotels(),
    })),
  })),

  withMethods((store) => ({
    setPlan(plan: TravelPlan): void {
      patchState(store, {
        summary: plan.summary,
        flights: plan.flights,
        hotels: orderHotelsByRoute(plan.hotels, plan.flights),
      });
    },

    addFlight(flight: FlightInfo): void {
      patchState(store, (state) => {
        const flights = upsertById(state.flights, flight);
        return { flights, hotels: orderHotelsByRoute(state.hotels, flights) };
      });
    },

    removeFlight(flightId: number): void {
      patchState(store, (state) => {
        const flights = state.flights.filter(
          (flight) => flight.id !== flightId,
        );
        return { flights, hotels: orderHotelsByRoute(state.hotels, flights) };
      });
    },

    replaceFlight(oldFlightId: number, flight: FlightInfo): void {
      patchState(store, (state) => {
        const flights = state.flights.map((current) =>
          current.id === oldFlightId ? flight : current,
        );
        return { flights, hotels: orderHotelsByRoute(state.hotels, flights) };
      });
    },

    addHotel(hotel: PlanHotel): void {
      // The plan holds at most one hotel per overnight city, so adding a hotel
      // for a city that already has one replaces it instead of duplicating.
      patchState(store, (state) => ({
        hotels: orderHotelsByRoute(
          [
            ...state.hotels.filter((current) => current.city !== hotel.city),
            hotel,
          ],
          state.flights,
        ),
      }));
    },

    removeHotel(hotelId: string): void {
      patchState(store, (state) => ({
        hotels: state.hotels.filter((hotel) => hotel.id !== hotelId),
      }));
    },

    clear(): void {
      patchState(store, { summary: '', flights: [], hotels: [] });
    },
  })),

  withDevtools('travelPlan'),
);

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
  hotels: PlanHotel[],
  flights: FlightInfo[],
): PlanHotel[] {
  const arrivalOrder = new Map<string, number>();
  flights.forEach((flight, index) => {
    if (!arrivalOrder.has(flight.to)) {
      arrivalOrder.set(flight.to, index);
    }
  });

  const rank = (hotel: PlanHotel): number =>
    arrivalOrder.get(hotel.city) ?? Number.MAX_SAFE_INTEGER;

  return [...hotels].sort((a, b) => rank(a) - rank(b));
}
