import { z } from 'zod/v3';

import { binding } from '../../../../shared/util-copilotkit/a2ui/a2ui-schema';

export const ticketWidgetSchema = z
  .object({
    ticketId: binding(z.union([z.string(), z.number()])),
    from: binding(z.string()),
    to: binding(z.string()),
    date: binding(z.string()),
    delay: binding(z.number()).optional(),
  })
  .strict();

type TicketWidgetSchema = z.infer<typeof ticketWidgetSchema>;

export type TicketWidgetProps = {
  [K in keyof TicketWidgetSchema]: Exclude<
    TicketWidgetSchema[K],
    { path: string }
  >;
};
