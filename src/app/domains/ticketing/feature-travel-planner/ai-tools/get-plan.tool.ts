import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { TravelPlanStore } from '../travel-plan-store';

export const getPlanTool = defineAgUiTool({
  name: 'getPlan',
  description: `
Returns the current travel plan the user is refining: { summary, flights, hotels }.
Each flight has id, from, to, date (ISO) and delay; each hotel has id, name,
sterne, city. Use it to read the current flights/hotels and a leg's date.
  `.trim(),
  execute: () => {
    const store = inject(TravelPlanStore);
    return {
      summary: store.summary(),
      flights: store.flights(),
      hotels: store.hotels(),
    };
  },
});
