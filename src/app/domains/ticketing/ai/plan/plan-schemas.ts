import { z } from 'zod';

/**
 * Schema building blocks shared between the plan store, the plan tools and the
 * plan widget. The co-planner never re-emits the whole plan as text anymore --
 * it operates on the canonical plan held in the PlanStore via the plan tools.
 * These schemas describe the data those tools exchange.
 */

export const planStepActionSchema = z
  .enum(['book', 'cancel', 'other'])
  .describe('Kind of step. Use "other" for non-booking steps.');

/**
 * A step as the agent proposes it. It carries no id -- the store assigns a
 * stable id on insertion so later edits can address the step by identity
 * instead of by a (fragile) position the model has to recompute every turn.
 */
export const planStepInputSchema = z.object({
  action: planStepActionSchema,
  flightId: z
    .number()
    .optional()
    .describe('Flight id this step refers to (if applicable).'),
  description: z.string().describe('Human-readable description of the step.'),
});

export type PlanStepInput = z.infer<typeof planStepInputSchema>;

/** A step as it lives in the store: an input step plus its stable id. */
export interface PlanStep extends PlanStepInput {
  id: string;
}
