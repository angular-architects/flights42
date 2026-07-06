import { createCustomCatalog } from '@internal/ag-ui-client';

import { ticketingExtraComponents } from './ticketing-extra-components';

export const customCatalog = createCustomCatalog({
  id: 'https://a2ui.org/specification/v0_9/basic_catalog.json',
  components: ticketingExtraComponents,
});
