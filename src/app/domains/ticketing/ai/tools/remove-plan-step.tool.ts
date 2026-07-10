import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

export const removePlanStepTool = createFrontendTool({
  name: 'removePlanStep',
  description: `
    Removes a single step from the plan. Address the step by its stable "id" (look
    it up via getPlan if you only know its position).

    Example — user: "Drop the cancellation."
      (getPlan shows the cancel step has id "s-1c08")
      removePlanStep({ "id": "s-1c08" })
  `,
  parameters: z.object({
    id: z.string().describe('Stable id of the step to remove.'),
  }),
  handler: async ({ id }) => {
    const store = inject(PlanStore);
    store.removeStep(id);
    return { stepCount: store.steps().length };
  },
});
