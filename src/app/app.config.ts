import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import { marked } from 'marked';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { a2uiActivityRendererConfig } from './domains/shared/util-copilotkit/a2ui/a2ui-activity-renderer';
import { provideA2uiCatalog } from './domains/shared/util-copilotkit/a2ui/provide-a2ui-catalog';
import {
  provideMcp,
  provideMcpApps,
} from './domains/shared/util-copilotkit/mcp-apps/mcp-apps.provider';
import { mcpAppsActivityRendererConfig } from './domains/shared/util-copilotkit/mcp-apps/mcp-apps-activity-renderer';
import { customCatalog } from './domains/ticketing/ai/custom-catalog/catalog';
import { mcpAppsConfig } from './mcp-apps.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),

    provideCopilotKit({
      defaultToolRendering: true,
      renderActivityMessages: [
        mcpAppsActivityRendererConfig,
        a2uiActivityRendererConfig,
      ],
    }),
    provideMcp({
      hotels: () => inject(ConfigService).mcpServerUrl,
    }),
    provideMcpApps(mcpAppsConfig),

    provideA2uiCatalog(customCatalog),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
    provideMarkdown(),
  ],
};
