import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { planStepInputSchema } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

export const setPlanTool = defineAgUiTool({
  name: 'setPlan',
  description: `
Creates or replaces the WHOLE co-plan at once. Use this only to draft the
initial plan, or when the user asks for a fundamentally different plan. For
incremental changes (add/remove/reorder/swap a single step) use the dedicated
step tools instead of rewriting everything.
  `.trim(),
  schema: z.object({
    title: z
      .string()
      .optional()
      .describe('Short title for the plan, e.g. "Rebook Paris trip".'),
    steps: z
      .array(planStepInputSchema)
      .describe('Ordered steps; the array order IS the execution order.'),
  }),
  execute: (args) => {
    const store = inject(PlanStore);
    store.setPlan(args);
    return { stepCount: args.steps.length };
  },
});
