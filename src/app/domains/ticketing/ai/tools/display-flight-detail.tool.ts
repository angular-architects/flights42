import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';

const displayFlightDetailSchema = z.object({
  flightId: z.number().describe('flightId of the flight to display'),
});

export type DisplayFlightDetailArgs = z.infer<typeof displayFlightDetailSchema>;

const displayFlightDetailDescription =
  'Routes to the detail of a flight. This detail view can be used to edit the flight.';

async function displayFlightDetail(
  args: DisplayFlightDetailArgs,
): Promise<{ ok: true }> {
  const router = inject(Router);
  await router.navigate(['/ticketing/booking/flight-edit', args.flightId]);
  return { ok: true };
}

export const displayFlightDetailFrontendTool = createFrontendTool({
  name: 'displayFlightDetail',
  description: displayFlightDetailDescription,
  parameters: displayFlightDetailSchema,
  handler: displayFlightDetail,
});

export const displayFlightDetailTool = defineAgUiTool({
  name: 'displayFlightDetail',
  description: displayFlightDetailDescription,
  schema: displayFlightDetailSchema,
  execute: displayFlightDetail,
});
