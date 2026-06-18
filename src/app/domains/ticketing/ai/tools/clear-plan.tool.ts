import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { PlanStore } from '../plan/plan-store';

export const clearPlanTool = defineAgUiTool({
  name: 'clearPlan',
  description: `
    Removes all steps and resets the co-plan. Use when the user wants to start over.

    Example — user: "Forget all this, let's start over."
      clearPlan()
  `,
  execute: () => {
    const store = inject(PlanStore);
    store.clear();
    return { cleared: true };
  },
});
