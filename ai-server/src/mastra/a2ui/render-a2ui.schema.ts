import { z } from 'zod';

export const renderA2uiInputSchema = z.object({
  surfaceId: z
    .string()
    .describe('Unique id for the surface, e.g. "booked-flights-table".'),
  components: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      'Flat A2UI v0.9 component array. Exactly one entry must have id "root".',
    ),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Initial surface data model for { "path": "/..." } bindings (forms, lists).',
    ),
});
export type RenderA2uiInput = z.infer<typeof renderA2uiInputSchema>;
