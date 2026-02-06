import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const getCurrentBasket = createTool({
  name: 'getCurrentBasket',
  description: `
    Returns all selected flights (flights in the basket) as an object
    mapping flightIds to a boolean (true: selected, false: deselected)
  `,
  handler: async () => {
    const store = inject(FlightStore);

    // TODO: Return basket
  },
});
