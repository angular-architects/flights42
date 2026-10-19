import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';

export const checkInTool = createFrontendTool({
  name: 'checkIn',
  description: 'Routes to the check-in page for a booked flight.',
  parameters: z.object({
    flightId: z.number().describe('flightId of the flight to check in for'),
  }),
  followUp: false,
  handler: async ({ flightId }) => {
    // TODO: Navigate to /checkin and pass the flightId as the
    //       matrix parameter ticketId
    return { ok: true };
  },
});
