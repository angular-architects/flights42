import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { PlanStore } from '../plan/plan-store';

export const getPlanTool = defineAgUiTool({
  name: 'getPlan',
  description: `
Returns the current co-plan as the canonical source of truth: its title and an
ordered list of steps. Each step carries a stable "id", its 1-based "position",
the "action" ("book" | "cancel" | "other"), an optional "flightId" and a
"description".

Call this BEFORE changing an existing plan instead of relying on memory. When
the user refers to a step by position ("step 3", "the last one", "der zweite
Schritt"), resolve that position to the step's "id" from this result and pass
that id to the editing tools.
  `.trim(),
  execute: () => {
    const store = inject(PlanStore);
    return {
      title: store.title(),
      steps: store.steps().map((step, index) => ({
        position: index + 1,
        ...step,
      })),
    };
  },
});
