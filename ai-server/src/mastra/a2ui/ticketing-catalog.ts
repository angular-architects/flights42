import { InMemoryCatalogProvider } from '@a2ui/agent';
import {
  A2UI_CATALOG_ID,
  extraTicketingComponentDefinitions,
} from '@flights42/a2ui-catalog/ticketing-extra-components';

import basicCatalog from '../../../../node_modules/@a2ui/web_core/src/v0_9/schemas/catalogs/basic/catalog.json';
import {
  extendCatalogSchema,
  PROTOCOL_VERSION,
  toCatalogComponents,
} from './a2ui-catalog-schema.js';

const extraTicketingComponents = toCatalogComponents(
  extraTicketingComponentDefinitions,
);

const catalogSchema = extendCatalogSchema(
  basicCatalog,
  extraTicketingComponents,
  A2UI_CATALOG_ID,
);

const catalogProvider = new InMemoryCatalogProvider(
  catalogSchema,
  PROTOCOL_VERSION,
);
export const ticketingCatalog = catalogProvider.load();
