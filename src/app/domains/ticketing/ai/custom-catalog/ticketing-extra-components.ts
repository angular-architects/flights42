import {
  type A2uiCustomCatalogComponent,
  createCustomComponent,
} from '@internal/ag-ui-client';
import { z } from 'zod';

import { TicketWidget } from './ticket/ticket-widget';

const dynamicValue = <T extends z.ZodTypeAny>(value: T) =>
  z.union([value, z.object({ path: z.string() }).strict()]);

const ticketWidgetSchema = z
  .object({
    ticketId: dynamicValue(z.union([z.string(), z.number()])),
    from: dynamicValue(z.string()),
    to: dynamicValue(z.string()),
    date: dynamicValue(z.string()),
    delay: dynamicValue(z.number()).optional(),
  })
  .strict();

export const ticketWidgetEntry = createCustomComponent({
  name: 'TicketWidget',
  description:
    'A boarding-pass-style widget that visualizes a single booked flight like a physical ticket. ONLY use this when the user EXPLICITLY asks for a ticket, boarding pass, ticket card, or similar (e.g. "show my ticket", "print my boarding pass", "give me my ticket for flight X"). For generic requests like "which flights are booked", "list my bookings", "show booked flights" use a normal Card / Column layout instead. Emit at most one TicketWidget per user request. Layout requirement: the TicketWidget needs the full width of the surface and must NOT be wrapped in a Card or nested inside a Row with other components. Place it as a direct child of the root Column (optionally with a single leading Text as heading). Props: ticketId (flight id), from/to (city names), date (ISO string), optional delay (minutes). Gate, seat and passenger are NOT configurable - the widget renders a generic boarding pass. Do not provide a "passenger" or "status" prop.',
  component: TicketWidget,
  schema: ticketWidgetSchema,
});

export const ticketingExtraComponents: A2uiCustomCatalogComponent[] = [
  ticketWidgetEntry,
];
