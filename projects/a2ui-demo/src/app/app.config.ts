import { DEFAULT_CATALOG, provideA2UI } from '@a2ui/angular';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import { a2uiDemoTheme } from './a2ui-demo-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideA2UI({ catalog: DEFAULT_CATALOG, theme: a2uiDemoTheme }),
  ],
};
