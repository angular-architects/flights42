import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStore } from '../plan/plan-store';

const swapPlanStepsDescription = `
    Swaps the positions of two steps. Address both steps by their stable "id" (look
    them up via getPlan). Use this for "swap steps 3 and 5", "do the cancel before
    the booking", etc.

    Example — user: "Swap steps 1 and 2."
      (getPlan shows step 1 has id "s-7f3a" and step 2 has id "s-1c08")
      swapPlanSteps({ "idA": "s-7f3a", "idB": "s-1c08" })
  `;

const swapPlanStepsSchema = z.object({
  idA: z.string().describe('Stable id of the first step.'),
  idB: z.string().describe('Stable id of the second step.'),
});

export type SwapPlanStepsArgs = z.infer<typeof swapPlanStepsSchema>;

function swapPlanSteps(args: SwapPlanStepsArgs) {
  const store = inject(PlanStore);
  store.swapSteps(args.idA, args.idB);
  return { swapped: [args.idA, args.idB] };
}

export const swapPlanStepsFrontendTool = createFrontendTool({
  name: 'swapPlanSteps',
  description: swapPlanStepsDescription,
  parameters: swapPlanStepsSchema,
  handler: async (args) => swapPlanSteps(args),
});

export const swapPlanStepsTool = defineAgUiTool({
  name: 'swapPlanSteps',
  description: swapPlanStepsDescription,
  schema: swapPlanStepsSchema,
  execute: swapPlanSteps,
});
