import { inject } from '@angular/core';
import { z } from 'zod';

import { defineAgUiTool } from '../../../shared/ui-agent/ag-ui-types';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const toggleFlightSelectionTool = defineAgUiTool({
  name: 'toggleFlightSelection',
  description:
    'Selects a flight or deselects it. Selected flights are added to the basket.',
  schema: z.object({
    flightId: z.number().describe('id of flight to select or deselect'),
    selected: z
      .boolean()
      .describe('whether flight should be selected or deselected'),
  }),
  execute: (args) => {
    const store = inject(FlightStore);
    store.updateBasket(args.flightId, args.selected);
    return { selected: args.selected };
  },
});
