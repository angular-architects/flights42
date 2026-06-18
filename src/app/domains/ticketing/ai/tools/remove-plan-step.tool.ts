import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { PlanStore } from '../plan/plan-store';

export const removePlanStepTool = defineAgUiTool({
  name: 'removePlanStep',
  description: `
    Removes a single step from the plan. Address the step by its stable "id" (look
    it up via getPlan if you only know its position).

    Example — user: "Drop the cancellation."
      (getPlan shows the cancel step has id "s-1c08")
      removePlanStep({ "id": "s-1c08" })
  `,
  schema: z.object({
    id: z.string().describe('Stable id of the step to remove.'),
  }),
  execute: (args) => {
    const store = inject(PlanStore);
    store.removeStep(args.id);
    return { stepCount: store.steps().length };
  },
});
