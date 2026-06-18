import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { PlanStore } from '../plan/plan-store';

export const movePlanStepTool = defineAgUiTool({
  name: 'movePlanStep',
  description: `
    Moves a single step to a new 1-based position in the plan, shifting the others.
    Address the step by its stable "id". Use this for "move step X up", "put it
    last", etc.

    Example — user: "Cancel first."
      (getPlan shows the cancel step has id "s-1c08")
      movePlanStep({ "id": "s-1c08", "toPosition": 1 })
  `,
  schema: z.object({
    id: z.string().describe('Stable id of the step to move.'),
    toPosition: z
      .number()
      .int()
      .min(1)
      .describe('1-based target position the step should end up at.'),
  }),
  execute: (args) => {
    const store = inject(PlanStore);
    store.moveStep(args.id, args.toPosition);
    return { moved: args.id, toPosition: args.toPosition };
  },
});
