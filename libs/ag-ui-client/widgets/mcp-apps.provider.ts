import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import type {
  McpUiHostCapabilities,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

import { ACTIVITY_RENDERERS } from '../activity/activity-renderer';
import { McpAppsActivityRenderer } from '../activity/mcp-apps-activity-renderer';

export type StyleVariables = NonNullable<
  McpUiHostContext['styles']
>['variables'];

export interface McpAppsConfig {
  hostInfo: Implementation;
  hostCapabilities: McpUiHostCapabilities;
  hostContext: McpUiHostContext;
}

export const MCP_APPS_CONFIG = new InjectionToken<McpAppsConfig>(
  'MCP_APPS_CONFIG',
);

export const MCP_APPS_SERVER_URL = new InjectionToken<string>(
  'MCP_APPS_SERVER_URL',
);

export function provideMcpApps(config: McpAppsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: MCP_APPS_CONFIG,
      useValue: config,
    },
    {
      provide: ACTIVITY_RENDERERS,
      useClass: McpAppsActivityRenderer,
      multi: true,
    },
  ]);
}
