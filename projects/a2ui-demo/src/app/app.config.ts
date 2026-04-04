import { provideA2UI } from '@a2ui/angular';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import { a2uiDemoTheme } from './a2ui-demo-theme';
import { customCatalog } from './custom-catalog/custom-catalog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideA2UI({ catalog: customCatalog, theme: a2uiDemoTheme }),
  ],
};
