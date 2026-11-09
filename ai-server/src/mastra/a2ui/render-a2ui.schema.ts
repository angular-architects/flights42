import { z } from 'zod';

export const renderA2uiInputSchema = z.object({
  express: z
    .string()
    .describe(
      'Complete A2UI Express program, including the <a2ui> and </a2ui> tags.',
    ),
});
