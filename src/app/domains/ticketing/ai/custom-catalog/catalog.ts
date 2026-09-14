import {
  type A2UICatalogDefinitions,
  createAngularCatalog,
} from '@copilotkit/angular/a2ui';
import { ticketingExtraComponents } from '@flights42/a2ui-catalog/ticketing-extra-components';

import { TicketWidget } from './ticket/ticket-widget';

export const customCatalog = createAngularCatalog(
  ticketingExtraComponents as unknown as A2UICatalogDefinitions,
  { TicketWidget },
  {
    catalogId: 'https://example.com/catalogs/flights42-a2ui-demo',
    includeBasicCatalog: true,
  },
);
