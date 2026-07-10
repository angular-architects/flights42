import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

export const swapPlanStepsTool = createFrontendTool({
  name: 'swapPlanSteps',
  description: `
    Swaps the positions of two steps. Address both steps by their stable "id" (look
    them up via getPlan). Use this for "swap steps 3 and 5", "do the cancel before
    the booking", etc.

    Example — user: "Swap steps 1 and 2."
      (getPlan shows step 1 has id "s-7f3a" and step 2 has id "s-1c08")
      swapPlanSteps({ "idA": "s-7f3a", "idB": "s-1c08" })
  `,
  parameters: z.object({
    idA: z.string().describe('Stable id of the first step.'),
    idB: z.string().describe('Stable id of the second step.'),
  }),
  handler: async ({ idA, idB }) => {
    const store = inject(PlanStore);
    store.swapSteps(idA, idB);
    return { swapped: [idA, idB] };
  },
});
