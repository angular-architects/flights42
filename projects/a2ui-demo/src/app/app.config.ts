import {
  A2UI_RENDERER_CONFIG,
  A2uiRendererService,
  provideMarkdownRenderer,
} from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { marked } from 'marked';

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
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
    A2uiRendererService,
  ],
};
