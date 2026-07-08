import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { planStepInputSchema } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

const addPlanStepDescription = `
    Adds a single step to the current plan. Appends it at the end unless a 1-based
    "position" is given (e.g. position 1 inserts it as the new first step).

    NEVER guess "position". You MUST omit it whenever the user does not explicitly
    say where the step should go — only set it when the user names a concrete spot
    ("as the first step", "before the cancellation", "at the end"). When in doubt,
    leave it out so the step is appended.

    Example — user: "Also book flight 393."
      addPlanStep({
        "step": { "action": "book", "flightId": 393, "description": "Book flight 393" }
      })
    Example — insert it as the new first step:
      addPlanStep({
        "step": { "action": "book", "flightId": 393, "description": "Book flight 393" },
        "position": 1
      })
  `;

const addPlanStepSchema = z.object({
  step: planStepInputSchema.describe('The step to add.'),
  position: z
    .number()
    .int()
    .min(1)
    .nullable()
    .optional()
    .describe(
      'OPTIONAL 1-based position to insert at. Omit this entirely unless the ' +
        'user explicitly states where the step goes — never guess it. ' +
        'When omitted (or null) the step is appended at the end.',
    ),
});

export type AddPlanStepArgs = z.infer<typeof addPlanStepSchema>;

function addPlanStep(args: AddPlanStepArgs) {
  const store = inject(PlanStore);
  store.addStep(args.step, args.position ?? undefined);
  return { stepCount: store.steps().length };
}

export const addPlanStepFrontendTool = createFrontendTool({
  name: 'addPlanStep',
  description: addPlanStepDescription,
  parameters: addPlanStepSchema,
  handler: async (args) => addPlanStep(args),
});

export const addPlanStepTool = defineAgUiTool({
  name: 'addPlanStep',
  description: addPlanStepDescription,
  schema: addPlanStepSchema,
  execute: addPlanStep,
});
