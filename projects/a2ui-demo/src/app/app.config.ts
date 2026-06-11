import {
  A2UI_RENDERER_CONFIG,
  A2uiRendererService,
  BasicCatalog,
  provideMarkdownRenderer,
} from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { marked } from 'marked';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: A2UI_RENDERER_CONFIG,
      useValue: {
        catalogs: [new BasicCatalog()],
      },
    },
    A2uiRendererService,
  ],
};
