import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

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

  withMethods((store) => ({
    // The plan is stored exactly as the model delivers it: the agent is asked
    // to keep flights in travel order and each hotel after its arrival flight.
    setPlan(plan: TravelPlan): void {
      patchState(store, plan);
    },

    clear(): void {
      patchState(store, { summary: '', flights: [], hotels: [] });
    },
  })),

  withDevtools('travelPlan'),
);
