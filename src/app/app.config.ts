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
  MCP_APPS_SERVER_URL,
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
      renderActivityMessages: [
        mcpAppsActivityRendererConfig,
        a2uiActivityRendererConfig,
      ],
    }),
    // A2UI catalog: registers the custom components with the renderer AND
    // exposes their descriptor at A2UI_CUSTOM_CATALOG so the ticketing agent
    // store can forward it — the server lists the components in its system
    // prompt (addCustomCatalogInstructions) and renders them via renderA2uiTool.
    provideA2uiCatalog(customCatalog),
    {
      provide: MCP_APPS_SERVER_URL,
      useFactory: () => inject(ConfigService).mcpServerUrl,
    },
    provideMcpApps(mcpAppsConfig),
    provideMarkdownRenderer(async (markdown) =>
      marked.parse(String(markdown ?? '')),
    ),
    provideMarkdown(),
  ],
};
