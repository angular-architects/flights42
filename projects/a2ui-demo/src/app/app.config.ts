import {
  BasicCatalog,
  provideA2Ui,
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
    provideA2Ui({
      // TODO: Register custom catalog i/o BasicCatalog
      catalogs: [new BasicCatalog()],
    }),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
  ],
};
