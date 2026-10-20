import { z } from 'zod';

export const planStepActionSchema = z
  .enum(['book', 'cancel', 'other'])
  .describe('Kind of step. Use "other" for non-booking steps.');

// The spec comes from the model (tool arguments), hence a Zod schema.
export const planStepSpecSchema = z.object({
  action: planStepActionSchema,
  flightId: z
    .number()
    .optional()
    .describe('Flight id this step refers to (if applicable).'),
  description: z.string().describe('Human-readable description of the step.'),
});

export type PlanStepAction = z.infer<typeof planStepActionSchema>;

export type PlanStepSpec = z.infer<typeof planStepSpecSchema>;

export type PlanStep = PlanStepSpec & {
  id: string;
};

export interface Plan {
  title: string;
  steps: PlanStep[];
}
