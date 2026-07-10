import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

export const reversePlanTool = createFrontendTool({
  name: 'reversePlan',
  description: `
    Reverses the order of ALL steps in the plan (the first step becomes the last,
    and so on). Use this when the user wants the whole plan flipped, e.g. "do it
    the other way round", "reverse the order". For swapping just two steps use
    swapPlanSteps instead.

    Example — user: "Reverse the order of the steps."
      reversePlan()
  `,
  parameters: z.object({}),
  handler: async () => {
    const store = inject(PlanStore);
    store.reverse();
    return { stepCount: store.steps().length };
  },
});
