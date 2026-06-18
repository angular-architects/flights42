import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { planStepInputSchema } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

export const addPlanStepTool = defineAgUiTool({
  name: 'addPlanStep',
  description: `
Adds a single step to the current plan. Appends it at the end unless a 1-based
"position" is given (e.g. position 1 inserts it as the new first step).
  `.trim(),
  schema: z.object({
    step: planStepInputSchema.describe('The step to add.'),
    position: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('1-based position to insert at. Appended when omitted.'),
  }),
  execute: (args) => {
    const store = inject(PlanStore);
    store.addStep(args.step, args.position);
    return { stepCount: store.steps().length };
  },
});
