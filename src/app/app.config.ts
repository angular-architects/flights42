import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import { provideMCPApps } from '@copilotkit/angular/mcp-apps';
import { marked } from 'marked';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { a2uiActivityRendererConfig } from './domains/shared/util-copilotkit/a2ui/a2ui-activity-renderer';
import { provideA2uiCatalog } from './domains/shared/util-copilotkit/a2ui/provide-a2ui-catalog';
import { customCatalog } from './domains/ticketing/ai/custom-catalog/catalog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),

    provideCopilotKit({
      defaultToolRendering: true,
      renderActivityMessages: [a2uiActivityRendererConfig],
    }),
    provideMCPApps({
      hostInfo: { name: 'Flights42 MCP Host', version: '1.0.0' },
      hostContext: {
        displayMode: 'inline',
        theme: 'light',
        styles: {
          variables: {
            '--color-ring-primary': '#3f51b5',
          },
        },
      },
    }),

    provideA2uiCatalog(customCatalog, { sendCatalogDescription: false }),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
    provideMarkdown(),
  ],
};
