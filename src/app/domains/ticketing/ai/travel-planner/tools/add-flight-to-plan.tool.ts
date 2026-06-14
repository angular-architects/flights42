import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { TravelPlanStore } from '../travel-plan-store';
import { planFlightSchema } from './plan-schemas';

export const addFlightToPlanTool = defineAgUiTool({
  name: 'addFlightToPlan',
  description:
    'Adds a flight to the current travel plan. Only call this when the user explicitly asks to add a flight to the plan.',
  schema: z.object({
    flight: planFlightSchema.describe('The flight to add to the plan'),
  }),
  execute: (args) => {
    const store = inject(TravelPlanStore);
    store.addFlight(args.flight);
    return { added: args.flight.id };
  },
});
