import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const toggleFlightSelection = createTool({
  name: 'toggleFlightSelection',
  description: `
    Selects a flight or deselects it. Selected flights are added to the basket.
  `,
  schema: s.object('search parameters for flights', {
    flightId: s.number('id of flight to select or deselect'),
    selected: s.boolean('whether flight should be selected or deselected'),
  }),
  handler: (input) => {
    const store = inject(FlightStore);
    store.updateBasket(input.flightId, input.selected);
    return Promise.resolve();
  },
});
