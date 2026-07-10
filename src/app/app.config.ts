import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import { provideA2uiCatalog } from '@internal/ag-ui-client';
import { marked } from 'marked';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { a2uiActivityRendererConfig } from './domains/shared/ui-assistant/copilot/a2ui/a2ui-activity-renderer';
import {
  MCP_APPS_SERVER_URL,
  provideMcpApps,
} from './domains/shared/ui-assistant/copilot/mcp-apps/mcp-apps.provider';
import { mcpAppsActivityRendererConfig } from './domains/shared/ui-assistant/copilot/mcp-apps/mcp-apps-activity-renderer';
import { provideWidgets } from './domains/shared/ui-assistant/copilot/widget-tools/widget';
import { messageWidget } from './domains/shared/ui-assistant/widgets/message-widget';
import { ConfigService } from './domains/shared/util-common/config-service';
import { customCatalog } from './domains/ticketing/ai/custom-catalog/catalog';
import { planWidget } from './domains/ticketing/ai/widgets/plan-widget';
import { hotelWidget } from './domains/ticketing/feature-travel-planner/ui/hotel-widget';
import { flightWidget } from './domains/ticketing/ui/flight-widget';
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
    provideWidgets([messageWidget, flightWidget, planWidget, hotelWidget]),
    // Legacy A2UI catalog + renderer, still used for server-driven A2UI surfaces.
    provideA2uiCatalog(customCatalog, {
      sendCatalogDescription: false,
    }),
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
