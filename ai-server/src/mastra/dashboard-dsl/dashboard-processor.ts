import {
  A2uiGenerator,
  CatalogConfig,
  InMemoryCatalogProvider,
} from '@a2ui/agent';

import { PROTOCOL_VERSION } from '../a2ui/a2ui-catalog-schema.js';
import { toMacroCatalog } from '../a2ui/simple-macros/macro.js';
import { dashboardMacros } from './dashboard-macros.js';

const DASHBOARD_CATALOG_ID =
  'https://example.com/catalogs/flights42-dashboard-macros';

export const dashboardProcessor = createDashboardProcessor();

function createDashboardProcessor() {
  const catalogSchema = toMacroCatalog(dashboardMacros, DASHBOARD_CATALOG_ID);

  const catalogProvider = new InMemoryCatalogProvider(
    catalogSchema,
    PROTOCOL_VERSION,
  );
  const dashboardCatalog = catalogProvider.load();

  const catalogConfig = new CatalogConfig(dashboardCatalog);

  const generator = new A2uiGenerator([catalogConfig]);

  return generator.createProcessor({
    supportedCatalogIds: [DASHBOARD_CATALOG_ID],
  });
}
