import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { TravelPlanStore } from '../travel-plan-store';

export const getTravelPlanTool = createFrontendTool({
  name: 'getTravelPlan',
  description: `
Returns the current travel plan the user is refining: { summary, flights, hotels }.
Each flight has id, from, to, date (ISO) and delay; each hotel has id, name, sterne, city.
Use this to know which flights/hotels are currently in the plan and, when the user
asks for flights of a route without giving a date, to read that leg's date.
  `.trim(),
  parameters: z.object({}),
  handler: async () => {
    const store = inject(TravelPlanStore);
    return {
      summary: store.summary(),
      flights: store.flights(),
      hotels: store.hotels(),
    };
  },
});
