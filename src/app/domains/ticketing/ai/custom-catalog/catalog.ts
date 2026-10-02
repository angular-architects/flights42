import {
  AngularCatalog,
  BASIC_COMPONENTS,
  BASIC_FUNCTIONS,
} from '@a2ui/angular/v0_9';

import { ticketWidgetEntry } from './ticketing-extra-components';

export const customCatalog = new AngularCatalog(
  'https://example.com/catalogs/flights42-a2ui-demo',
  [...BASIC_COMPONENTS, ticketWidgetEntry],
  BASIC_FUNCTIONS,
);
