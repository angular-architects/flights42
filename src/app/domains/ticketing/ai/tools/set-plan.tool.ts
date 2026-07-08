import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { planStepInputSchema } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

const setPlanDescription = `
    Creates or replaces the WHOLE co-plan at once. Use this only to draft the
    initial plan, or when the user asks for a fundamentally different plan. For
    incremental changes (add/remove/reorder/swap a single step) use the dedicated
    step tools instead of rewriting everything.

    Example — user: "Rebook flight 390 for 391."
      setPlan({
        "title": "Rebook Paris trip",
        "steps": [
          { "action": "book",   "flightId": 391, "description": "Book replacement flight 391" },
          { "action": "cancel", "flightId": 390, "description": "Cancel existing flight 390" }
        ]
      })
  `;

const setPlanSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Short title for the plan, e.g. "Rebook Paris trip".'),
  steps: z
    .array(planStepInputSchema)
    .describe('Ordered steps; the array order IS the execution order.'),
});

export type SetPlanArgs = z.infer<typeof setPlanSchema>;

function setPlan(args: SetPlanArgs) {
  const store = inject(PlanStore);
  store.setPlan(args);
  return { stepCount: args.steps.length };
}

export const setPlanFrontendTool = createFrontendTool({
  name: 'setPlan',
  description: setPlanDescription,
  parameters: setPlanSchema,
  handler: async (args) => setPlan(args),
});

export const setPlanTool = defineAgUiTool({
  name: 'setPlan',
  description: setPlanDescription,
  schema: setPlanSchema,
  execute: setPlan,
});
