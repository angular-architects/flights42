import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { planStepActionSchema } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

export const updatePlanStepTool = defineAgUiTool({
  name: 'updatePlanStep',
  description: `
Changes fields of a single existing step (its action, flightId or description)
without touching the rest of the plan. Address the step by its stable "id".
Only the fields you pass are changed.

Example — user: "Make the booking flight 395 instead."
  (getPlan shows the book step has id "s-7f3a")
  updatePlanStep({ "id": "s-7f3a", "flightId": 395, "description": "Book flight 395" })
  `.trim(),
  schema: z.object({
    id: z.string().describe('Stable id of the step to update.'),
    action: planStepActionSchema.optional(),
    flightId: z
      .number()
      .optional()
      .describe('New flight id this step refers to.'),
    description: z.string().optional().describe('New description.'),
  }),
  execute: (args) => {
    const store = inject(PlanStore);
    const { id, ...patch } = args;
    store.updateStep(id, patch);
    return { updated: id };
  },
});
