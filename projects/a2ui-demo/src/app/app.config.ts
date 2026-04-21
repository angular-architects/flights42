import { A2UI_RENDERER_CONFIG, A2uiRendererService } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import { customCatalog } from './custom-catalog/custom-catalog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: A2UI_RENDERER_CONFIG,
      useValue: {
        catalogs: [customCatalog],
      },
    },
    A2uiRendererService,
  ],
};
