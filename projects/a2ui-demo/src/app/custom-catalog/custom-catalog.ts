import {
  AngularCatalog,
  BASIC_COMPONENTS,
  BASIC_FUNCTIONS,
} from '@a2ui/angular/v0_9';

import { formatIdImplementation } from './format-id';
import { milesProgressEntry } from './miles-progress';

export const customCatalog = new AngularCatalog(
  'https://example.com/catalogs/flights42-a2ui-demo',
  [...BASIC_COMPONENTS, milesProgressEntry],
  [...BASIC_FUNCTIONS, formatIdImplementation],
);
