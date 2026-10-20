import { createAngularCatalog } from '@copilotkit/angular/a2ui';

import { TicketWidget } from './ticket/ticket-widget';
import { ticketingExtraComponents } from './ticketing-extra-components';

export const customCatalog = createAngularCatalog(
  ticketingExtraComponents,
  // TODO: map the name TicketWidget to our TicketWidget component
  {},
  {
    catalogId: 'https://example.com/catalogs/flights42-a2ui-demo',
    includeBasicCatalog: true,
  },
);
