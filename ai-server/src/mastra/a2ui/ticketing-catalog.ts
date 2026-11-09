import {
  A2UI_CATALOG_ID,
  extraTicketingComponentDefinitions,
} from '@flights42/a2ui-catalog/ticketing-extra-components';

import {
  basicComponents,
  createCatalog,
  toCatalogComponents,
} from './a2ui-express.js';

const extraTicketingComponents = toCatalogComponents(
  extraTicketingComponentDefinitions,
);

const components = { ...basicComponents, ...extraTicketingComponents };

export const ticketingCatalog = createCatalog(components, A2UI_CATALOG_ID);
