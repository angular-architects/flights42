import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';

import { FlightDetailStore } from '../../feature-booking/flight-edit/flight-detail-store';

export const getCurrentFlight = createTool({
  name: 'getCurrentFlight',
  description: `
    Get the flight currently displayed in the detail view.

    So, when the user refers to "the flight" or "this flight" or "current flight", you can update it with this tool.
    
    Preconditions:
    - This tool can ONLY be used when the current route is /flight-booking/flight-edit
      Check this precondition before using this tool.
  `,
  handler: () => {
    const store = inject(FlightDetailStore);
    return Promise.resolve(store.flightValue());
  },
});
