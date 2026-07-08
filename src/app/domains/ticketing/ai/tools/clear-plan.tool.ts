import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

const clearPlanSchema = z.object({});

export type ClearPlanArgs = z.infer<typeof clearPlanSchema>;

const clearPlanDescription = `
    Removes all steps and resets the co-plan. Use when the user wants to start over.

    Example — user: "Forget all this, let's start over."
      clearPlan()
  `;

function clearPlan(_args: ClearPlanArgs) {
  const store = inject(PlanStore);
  store.clear();
  return { cleared: true };
}

export const clearPlanFrontendTool = createFrontendTool({
  name: 'clearPlan',
  description: clearPlanDescription,
  parameters: clearPlanSchema,
  handler: async (args) => clearPlan(args),
});

export const clearPlanTool = defineAgUiTool({
  name: 'clearPlan',
  description: clearPlanDescription,
  schema: clearPlanSchema,
  execute: clearPlan,
});
