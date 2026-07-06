import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { MCP_APPS_SERVER_URL, provideMcpApps } from '@internal/ag-ui-client';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { mcpAppsConfig } from './mcp-apps.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: MCP_APPS_SERVER_URL,
      useFactory: () => inject(ConfigService).mcpServerUrl,
    },
    provideMcpApps(mcpAppsConfig),
    provideMarkdown(),
  ],
};
