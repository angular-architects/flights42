import { BASIC_FUNCTIONS, BasicCatalogBase } from '@a2ui/angular/v0_9';

import { formatIdImplementation } from './format-id';
import { milesProgressEntry } from './miles-progress';

export const customCatalog = new BasicCatalogBase({
  id: 'https://example.com/catalogs/flights42-a2ui-demo',
  extraComponents: [milesProgressEntry],
  functions: [...BASIC_FUNCTIONS, formatIdImplementation],
});
