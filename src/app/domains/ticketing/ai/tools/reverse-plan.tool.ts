import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

const reversePlanSchema = z.object({});

export type ReversePlanArgs = z.infer<typeof reversePlanSchema>;

const reversePlanDescription = `
    Reverses the order of ALL steps in the plan (the first step becomes the last,
    and so on). Use this when the user wants the whole plan flipped, e.g. "do it
    the other way round", "reverse the order". For swapping just two steps use
    swapPlanSteps instead.

    Example — user: "Reverse the order of the steps."
      reversePlan()
  `;

function reversePlan(_args: ReversePlanArgs) {
  const store = inject(PlanStore);
  store.reverse();
  return { stepCount: store.steps().length };
}

export const reversePlanFrontendTool = createFrontendTool({
  name: 'reversePlan',
  description: reversePlanDescription,
  parameters: reversePlanSchema,
  handler: async (args) => reversePlan(args),
});

export const reversePlanTool = defineAgUiTool({
  name: 'reversePlan',
  description: reversePlanDescription,
  schema: reversePlanSchema,
  execute: reversePlan,
});
