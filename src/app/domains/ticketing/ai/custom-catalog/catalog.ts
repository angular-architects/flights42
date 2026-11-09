import {
  type A2UICatalogDefinitions,
  createAngularCatalog,
} from '@copilotkit/angular/a2ui';
import {
  A2UI_CATALOG_ID,
  extraTicketingComponentDefinitions,
} from '@flights42/a2ui-catalog/ticketing-extra-components';

import { TicketWidget } from './ticket/ticket-widget';

export const customCatalog = createAngularCatalog(
  extraTicketingComponentDefinitions as unknown as A2UICatalogDefinitions,
  { TicketWidget },
  {
    catalogId: A2UI_CATALOG_ID,
    includeBasicCatalog: true,
  },
);
