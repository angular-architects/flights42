import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { provideA2uiCatalog } from '@internal/ag-ui-client';
import { marked } from 'marked';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { ticketingExtraComponents } from './domains/ticketing/ai/custom-catalog/ticketing-extra-components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    // provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    // Demo-simplification: sendCatalogDescription forwards the full
    // descriptor (component schemas etc.) to the agent so the LLM can build
    // valid A2UI messages without server-side knowledge of the catalog.
    // In production, set sendCatalogDescription: false and let the server
    // resolve the catalog id against its own trusted registry to avoid
    // prompt-injection attacks via untrusted component metadata.
    provideA2uiCatalog({
      id: 'https://angularArchitects.io/a2ui/v0_9/custom_catalog.json',
      components: ticketingExtraComponents,
      sendCatalogDescription: true,
    }),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
    provideHashbrown({
      baseUrl: 'http://localhost:3000/api/chat',
      emulateStructuredOutput: true,
      middleware: [
        (request) => {
          console.log('[Hashbrown Request]', request);
          return request;
        },
      ],
    }),
    provideMarkdown(),
  ],
};
