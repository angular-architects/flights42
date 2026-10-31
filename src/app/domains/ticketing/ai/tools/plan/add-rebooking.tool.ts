import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../../plan/plan-store';

export const addRebookingTool = createFrontendTool({
  name: 'addRebooking',
  description: `
    Adds a rebooking to the plan: a step that cancels a booked flight and a step
    that books the new flight. Works on an empty plan, too — no getPlan needed.
    Use it for "verschiebe N auf M", "buche N auf M um", "rebook N to M".

    Example — user: "Verschiebe 1 auf 5"
      addRebooking({ "cancelFlightId": 1, "bookFlightId": 5 })
  `,
  parameters: z.object({
    cancelFlightId: z.number().describe('Id of the booked flight to cancel.'),
    bookFlightId: z.number().describe('Id of the flight to book instead.'),
  }),
  handler: async ({ cancelFlightId, bookFlightId }) => {
    const store = inject(PlanStore);
    store.addStep({
      action: 'cancel',
      flightId: cancelFlightId,
      description: `Cancel flight ${cancelFlightId}`,
    });
    store.addStep({
      action: 'book',
      flightId: bookFlightId,
      description: `Book flight ${bookFlightId}`,
    });
    return { stepCount: store.steps().length };
  },
});
