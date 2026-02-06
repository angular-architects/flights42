import { signalStore, withState } from '@ngrx/signals';

export interface FlightFilter {
  from: string;
  to: string;
}

export const FlightStore = signalStore(
  { providedIn: 'root' },

  withState({
    // TODO: Define state: from, to, basket, delayInMin
  }),

  // TODO: Add withProps for injecting the FlightClient

  // TODO: Add withResource; get the resource from the FlightClient

  // TODO: Add withComponent to compute flightsWithDelays

  // TODO: Add withMethods: updateFilter, updateBasket, reload, delay

  // TODO: Add withDevtools
);

// TODO: Call this function in your delay method
/*
function toFlightsWithDelays(flights: Flight[], delay: number): Flight[] {
  if (flights.length === 0) {
    return [];
  }

  const ONE_MINUTE = 1000 * 60;
  const oldFlights = flights;
  const oldFlight = oldFlights[0];
  const oldDate = new Date(oldFlight.date);
  const newDate = new Date(oldDate.getTime() + delay * ONE_MINUTE);
  const newFlight = { ...oldFlight, date: newDate.toISOString() };

  return [newFlight, ...flights.slice(1)];
}
*/
