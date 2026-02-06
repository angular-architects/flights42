import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createTool } from '@hashbrownai/angular';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const findFlightsTool = createTool({
  name: 'findFlights',
  description: `
  Searches for flights and redirects the user to the result page where the found flights are shown.
  
  Remarks:
  - For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
  `,
  // TODO: Add schema for parameter object with a from and to property
  handler: async (input) => {
    const store = inject(FlightStore);
    const router = inject(Router);

    // TODO: Use store to search for flights

    router.navigate(['/ticketing/booking/flight-search']);
  },
});
