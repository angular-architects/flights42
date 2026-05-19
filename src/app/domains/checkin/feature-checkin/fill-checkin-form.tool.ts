import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { CheckinTicketStore, TicketInfoSchema } from './checkin-ticket-store';

export const fillCheckinFormClientTool = defineAgUiTool({
  name: 'fillCheckinForm',
  description: `
Fills the on-screen check-in form with the fields you extracted from the
uploaded ticket image. Only include fields that are clearly legible —
omit a field entirely if you are not sure. The form is also editable
manually, so the user will confirm the values before submitting.
`.trim(),
  schema: TicketInfoSchema,
  execute: (args) => {
    const store = inject(CheckinTicketStore);
    store.setExtractedTicket(args);
    return { ok: true };
  },
});
