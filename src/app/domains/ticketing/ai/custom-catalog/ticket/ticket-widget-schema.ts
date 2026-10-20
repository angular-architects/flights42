import { z } from 'zod/v3';

import {
  binding,
  type WithoutBinding,
} from '../../../../shared/util-copilotkit/a2ui/a2ui-schema';

export const ticketSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number().optional(),
});

export const ticketWidgetSchema = z
  .object({
    // TODO: describe the widget's prop ticket
    // HINT: use the above declared ticketSchema and wrap it
    //       in the binding helper imported above
  })
  .strict();

export type TicketWidgetProps = WithoutBinding<
  z.infer<typeof ticketWidgetSchema>
>;
