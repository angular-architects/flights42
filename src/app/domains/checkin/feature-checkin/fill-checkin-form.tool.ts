import { inject } from '@angular/core';

import { createFrontendTool } from '../../shared/util-copilotkit/tool-definition';
import { CheckinTicketStore, TicketInfoSchema } from './checkin-ticket-store';

export const fillCheckinFormClientTool = createFrontendTool({
  name: 'fillCheckinForm',
  description: `
Fills the on-screen check-in form with the fields you extracted from the
uploaded ticket image. Only include fields that are clearly legible —
omit a field entirely if you are not sure. The form is also editable
manually, so the user will confirm the values before submitting.
`.trim(),
  parameters: TicketInfoSchema,
  handler: async (args) => {
    const store = inject(CheckinTicketStore);
    // The model sometimes emits the literal string "unknown" for the email
    // address instead of omitting it. Treat that as "no value".
    if (args.passenger?.email === 'unknown') {
      args.passenger.email = '';
    }
    store.setExtractedTicket(args);
    return { ok: true };
  },
});
