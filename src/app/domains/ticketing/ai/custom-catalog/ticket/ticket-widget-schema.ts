import { z } from 'zod/v3';

import { binding } from '../../../../shared/util-copilotkit/a2ui/a2ui-schema';

export const ticketSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number().optional(),
});

export const ticketWidgetSchema = z
  .object({
    // TODO: describe the widget's prop flight
    // HINT: use the above declared ticketSchema and wrap it
    //       in the binding helper imported above
  })
  .strict();

export type Ticket = z.infer<typeof ticketSchema>;
