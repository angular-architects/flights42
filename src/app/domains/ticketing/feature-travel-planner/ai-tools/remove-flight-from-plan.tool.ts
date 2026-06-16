import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { TravelPlanStore } from '../travel-plan-store';

export const removeFlightFromPlanTool = defineAgUiTool({
  name: 'removeFlightFromPlan',
  description:
    'Removes a flight from the current travel plan by its id. Only call this when the user explicitly asks to remove a flight.',
  schema: z.object({
    flightId: z.number().describe('Id of the flight to remove from the plan'),
  }),
  execute: (args) => {
    const store = inject(TravelPlanStore);
    store.removeFlight(args.flightId);
    return { removed: args.flightId };
  },
});
