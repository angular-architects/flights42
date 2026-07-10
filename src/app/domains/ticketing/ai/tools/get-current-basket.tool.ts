import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { FlightStore } from '../../data/flight-store';

export const getCurrentBasketTool = createFrontendTool({
  name: 'getCurrentBasket',
  description:
    'Returns all selected flights as an object mapping flightIds to booleans.',
  parameters: z.object({}),
  handler: async () => {
    const store = inject(FlightStore);
    return store.basket();
  },
});
