import type { A2UICatalogDefinitions } from '@copilotkit/angular/a2ui';

import { ticketWidgetSchema } from './ticket/ticket-widget-schema';

export const ticketingExtraComponents = {
  TicketWidget: {
    props: ticketWidgetSchema,
    description:
      'A boarding-pass-style widget that visualizes a single booked flight like a physical ticket. ONLY use this when the user EXPLICITLY asks for a ticket, boarding pass, ticket card, or similar (e.g. "show my ticket", "print my boarding pass", "give me my ticket for flight X"). For generic requests like "which flights are booked", "list my bookings", "show booked flights" use a normal Card / Column layout instead. Emit at most one TicketWidget per user request. Layout requirement: the TicketWidget needs the full width of the surface and must NOT be wrapped in a Card or nested inside a Row with other components. Place it as a direct child of the root Column (optionally with a single leading Text as heading). Prop: flight - the booked flight as an object { id, from, to, date (ISO string), optional delay (minutes) }; pass it as a literal object copied from the flight data, or bind it to a flight object in the data model, e.g. { "path": "/flights/0" }. Gate, seat and passenger are NOT configurable - the widget renders a generic boarding pass. Do not provide a "passenger" or "status" prop.',
  },
} as unknown as A2UICatalogDefinitions;
