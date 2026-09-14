import { provideA2Ui, provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { marked } from 'marked';

import { customCatalog } from './custom-catalog/custom-catalog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideA2Ui({ catalogs: [customCatalog] }),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
  ],
};
