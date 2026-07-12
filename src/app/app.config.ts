import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { COPILOT_KIT_CONFIG, type CopilotKitConfig } from '@copilotkit/angular';
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
import { openGenerativeUiActivityRendererConfig } from './shell/generative-ui/open-generative-ui-activity-renderer';
import { createSandboxFunctions } from './shell/generative-ui/sandbox-functions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),
    // Provides COPILOT_KIT_CONFIG via factory (instead of provideCopilotKit,
    // which only supports a static value) so the sandbox functions can read
    // the AI server URL from the ConfigService loaded at startup.
    {
      provide: COPILOT_KIT_CONFIG,
      useFactory: (): CopilotKitConfig => ({
        renderActivityMessages: [
          mcpAppsActivityRendererConfig,
          a2uiActivityRendererConfig,
          openGenerativeUiActivityRendererConfig,
        ],
        openGenerativeUI: {
          sandboxFunctions: createSandboxFunctions(inject(ConfigService)),
        },
      }),
    },
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
