import {
  type AngularComponentImplementation,
  BASIC_FUNCTIONS,
  BasicCatalogBase,
} from '@a2ui/angular/v0_9';
import { type A2uiCustomCatalogComponent } from '@internal/ag-ui-client';

import { ticketingExtraComponents } from './ticketing-extra-components';

export const TICKETING_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';

function toAngularComponentImplementation(
  entry: A2uiCustomCatalogComponent,
): AngularComponentImplementation {
  return {
    name: entry.name,
    component: entry.component,
    schema: entry.schema,
  } as unknown as AngularComponentImplementation;
}

export const customCatalog = new BasicCatalogBase({
  id: TICKETING_CATALOG_ID,
  extraComponents: ticketingExtraComponents.map(
    toAngularComponentImplementation,
  ),
  functions: [...BASIC_FUNCTIONS],
});
