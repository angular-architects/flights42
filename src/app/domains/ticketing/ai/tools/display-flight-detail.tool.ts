import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { defineAgUiTool } from '@internal/ag-ui';
import { z } from 'zod';

export const displayFlightDetailTool = defineAgUiTool({
  name: 'displayFlightDetail',
  description:
    'Routes to the detail of a flight. This detail view can be used to edit the flight.',
  schema: z.object({
    flightId: z.number().describe('flightId of the flight to display'),
  }),
  execute: async (args) => {
    const router = inject(Router);
    await router.navigate(['/ticketing/booking/flight-edit', args.flightId]);
    return { ok: true };
  },
});
