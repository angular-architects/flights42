import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

const getPlanSchema = z.object({});

export type GetPlanArgs = z.infer<typeof getPlanSchema>;

const getPlanDescription = `
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
  `;

function getPlan(_args: GetPlanArgs) {
  const store = inject(PlanStore);
  return {
    title: store.title(),
    steps: store.steps().map((step, index) => ({
      position: index + 1,
      ...step,
    })),
  };
}

export const getPlanFrontendTool = createFrontendTool({
  name: 'getPlan',
  description: getPlanDescription,
  parameters: getPlanSchema,
  handler: async (args) => getPlan(args),
});

export const getPlanTool = defineAgUiTool({
  name: 'getPlan',
  description: getPlanDescription,
  schema: getPlanSchema,
  execute: getPlan,
});
