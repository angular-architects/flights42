import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import { provideMCPApps } from '@copilotkit/angular/mcp-apps';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { mcpAppsConfig } from './mcp-apps.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideRouter(routes, withComponentInputBinding()),

    provideCopilotKit({
      defaultToolRendering: true,
      enableInspector: false,
    }),

    provideMCPApps(mcpAppsConfig),

    provideMarkdown(),
  ],
};
