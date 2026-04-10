import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const getCurrentBasketTool = defineAgUiTool({
  name: 'getCurrentBasket',
  description:
    'Returns all selected flights as an object mapping flightIds to booleans.',
  execute: () => {
    const store = inject(FlightStore);
    return store.basket();
  },
});
