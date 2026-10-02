import { type AngularCatalog, provideA2Ui } from '@a2ui/angular/v0_9';
import { type Context } from '@ag-ui/core';
import {
  type EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';

import { catalogToContextEntry } from './catalog-context';

export const A2UI_CATALOG_CONTEXT = new InjectionToken<Context>(
  'A2UI_CATALOG_CONTEXT',
);

export function provideA2uiCatalog(
  catalog: AngularCatalog,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideA2Ui({ catalogs: [catalog] }),
    {
      provide: A2UI_CATALOG_CONTEXT,
      useFactory: () => catalogToContextEntry(catalog),
    },
  ]);
}
