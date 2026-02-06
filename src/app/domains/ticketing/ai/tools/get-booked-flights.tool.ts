import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';

import { NextFlightsStore } from '../../feature-next-flights/next-flights-overview/next-flights-store';

export const getBookedFlights = createTool({
  name: 'getBookedFlights',
  description: `
    Returns the booked flights (aka next flights) of the current user.
    Only use this when the user explicitly asks for booked flights, tickets or checking in to a flight.
    The returned flights are booked. 
    Hence, if displayed with the flightWidget, use status: 'booked' (!)
  `,
  handler: async () => {
    const service = inject(NextFlightsStore);

    // TODO: Load booked flights (don't forget the `await` statement)
    // TODO: Return booked flights
  },
});
