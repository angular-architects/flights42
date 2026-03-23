import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const findFlightsTool = createTool({
  name: 'findFlights',
  description: `
  Searches for flights and redirects the user to the result page where the found flights are shown.
  
  Remarks:
  - For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
  `,
  schema: s.object('search parameters for flights', {
    from: s.string('airport of departure'),
    to: s.string('airport of destination'),
  }),
  handler: async (input) => {
    const store = inject(FlightStore);
    const router = inject(Router);

    store.updateFilter(input.from, input.to);

    router.navigate(['/ticketing/booking/flight-search']);
  },
});
