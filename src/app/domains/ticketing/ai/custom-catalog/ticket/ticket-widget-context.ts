import { z } from 'zod/v3';

import { binding } from '../../../../shared/util-copilotkit/a2ui/a2ui-schema';

export const ticketWidgetSchema = z
  .object({
    // TODO: describe the widget's props: ticketId (string or number),
    //       from, to, date (strings), and an optional delay (number)
    // HINT: wrap each value schema in the binding helper imported above
  })
  .strict();

type TicketWidgetSchema = z.infer<typeof ticketWidgetSchema>;

export type TicketWidgetProps = {
  [K in keyof TicketWidgetSchema]: Exclude<
    TicketWidgetSchema[K],
    { path: string }
  >;
};
