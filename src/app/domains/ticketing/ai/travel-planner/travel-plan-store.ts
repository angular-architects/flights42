import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { FlightInfo } from '../../data/flight-info';

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

  withMethods((store) => ({
    setPlan(plan: TravelPlan): void {
      patchState(store, {
        summary: plan.summary,
        flights: plan.flights,
        hotels: plan.hotels,
      });
    },

    addFlight(flight: FlightInfo): void {
      patchState(store, (state) => ({
        flights: upsertById(state.flights, flight),
      }));
    },

    removeFlight(flightId: number): void {
      patchState(store, (state) => ({
        flights: state.flights.filter((flight) => flight.id !== flightId),
      }));
    },

    replaceFlight(oldFlightId: number, flight: FlightInfo): void {
      patchState(store, (state) => ({
        flights: state.flights.map((current) =>
          current.id === oldFlightId ? flight : current,
        ),
      }));
    },

    addHotel(hotel: PlanHotel): void {
      // The plan holds at most one hotel per overnight city, so adding a hotel
      // for a city that already has one replaces it instead of duplicating.
      patchState(store, (state) => ({
        hotels: [
          ...state.hotels.filter((current) => current.city !== hotel.city),
          hotel,
        ],
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
