import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

const removePlanStepDescription = `
    Removes a single step from the plan. Address the step by its stable "id" (look
    it up via getPlan if you only know its position).

    Example — user: "Drop the cancellation."
      (getPlan shows the cancel step has id "s-1c08")
      removePlanStep({ "id": "s-1c08" })
  `;

const removePlanStepSchema = z.object({
  id: z.string().describe('Stable id of the step to remove.'),
});

export type RemovePlanStepArgs = z.infer<typeof removePlanStepSchema>;

function removePlanStep(args: RemovePlanStepArgs) {
  const store = inject(PlanStore);
  store.removeStep(args.id);
  return { stepCount: store.steps().length };
}

export const removePlanStepFrontendTool = createFrontendTool({
  name: 'removePlanStep',
  description: removePlanStepDescription,
  parameters: removePlanStepSchema,
  handler: async (args) => removePlanStep(args),
});

export const removePlanStepTool = defineAgUiTool({
  name: 'removePlanStep',
  description: removePlanStepDescription,
  schema: removePlanStepSchema,
  execute: removePlanStep,
});
