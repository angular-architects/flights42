import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import {
  mcpAppsActivityRendererConfig,
  provideMCPApps,
} from '@copilotkit/angular/mcp-apps';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { customCatalog } from './domains/ticketing/ai/custom-catalog/catalog';
import { mcpAppsConfig } from './mcp-apps.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),

    provideCopilotKit({
      defaultToolRendering: true,
      renderActivityMessages: [mcpAppsActivityRendererConfig],
      enableInspector: false,
      a2ui: { catalog: customCatalog, includeSchema: false },
    }),

    provideMCPApps(mcpAppsConfig),

    provideMarkdown(),
  ],
};
