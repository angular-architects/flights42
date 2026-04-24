import {
  A2uiCustomCatalogComponent,
  binding,
  createCustomComponent,
} from '@internal/ag-ui-client';
import { z } from 'zod';

import { TicketWidget } from './ticket/ticket-widget';

export const ticketWidgetEntry = createCustomComponent({
  name: 'TicketWidget',
  description:
    'A boarding-pass-style widget that visualizes a single booked flight like a physical ticket. ONLY use this when the user EXPLICITLY asks for a ticket, boarding pass, ticket card, or similar (e.g. "show my ticket", "print my boarding pass", "give me my ticket for flight X"). For generic requests like "which flights are booked", "list my bookings", "show booked flights" use a normal Card / Column layout instead. Emit at most one TicketWidget per user request. Layout requirement: the TicketWidget needs the full width of the surface and must NOT be wrapped in a Card or nested inside a Row with other components. Place it as a direct child of the root Column (optionally with a single leading Text as heading). Props: ticketId (flight id), from/to (city names), date (ISO string), optional delay (minutes). Gate, seat and passenger are NOT configurable - the widget renders a generic boarding pass. Do not provide a "passenger" or "status" prop.',
  component: TicketWidget,
  schema: z
    .object({
      ticketId: binding(z.union([z.string(), z.number()])),
      from: binding(z.string()),
      to: binding(z.string()),
      date: binding(z.string()),
      delay: binding(z.number()).optional(),
    })
    .strict(),
});

export const ticketingExtraComponents: A2uiCustomCatalogComponent[] = [
  ticketWidgetEntry,
];
