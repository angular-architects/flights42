import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export interface TravelPlannerRequest {
  from: string;
  to: string;
  duration: number;
  preferences: string;
}

/**
 * Holds the traveler's request (form inputs) as the single source of truth, so
 * other services (e.g. the refinement chat) can read the preferences without
 * the page having to push them around.
 */
export const TravelPlannerRequestStore = signalStore(
  { providedIn: 'root' },

  withState<TravelPlannerRequest>({
    from: 'Graz',
    to: 'Rome',
    duration: 3,
    preferences: '',
  }),

  withMethods((store) => ({
    setRequest(request: TravelPlannerRequest): void {
      patchState(store, {
        ...request,
        preferences: request.preferences.trim(),
      });
    },
  })),
);
