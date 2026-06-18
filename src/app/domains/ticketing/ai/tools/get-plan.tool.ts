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

    Example — read the plan before editing it:
      getPlan()
      → {
          "title": "Rebook Paris trip",
          "steps": [
            { "position": 1, "id": "s-7f3a", "action": "book",   "flightId": 391, "description": "Book flight 391" },
            { "position": 2, "id": "s-1c08", "action": "cancel", "flightId": 390, "description": "Cancel flight 390" }
          ]
        }
  `,
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
