import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { PlanStore } from '../plan/plan-store';

export const reversePlanTool = defineAgUiTool({
  name: 'reversePlan',
  description: `
    Reverses the order of ALL steps in the plan (the first step becomes the last,
    and so on). Use this when the user wants the whole plan flipped, e.g. "do it
    the other way round", "reverse the order". For swapping just two steps use
    swapPlanSteps instead.

    Example — user: "Reverse the order of the steps."
      reversePlan()
  `,
  execute: () => {
    const store = inject(PlanStore);
    store.reverse();
    return { stepCount: store.steps().length };
  },
});
