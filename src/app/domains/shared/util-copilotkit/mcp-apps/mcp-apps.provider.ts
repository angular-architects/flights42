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

export type StyleVariables = NonNullable<
  McpUiHostContext['styles']
>['variables'];

export interface McpAppsConfig {
  hostInfo: Implementation;
  hostCapabilities?: McpUiHostCapabilities;
  hostContext: McpUiHostContext;
}

export const MCP_APPS_CONFIG = new InjectionToken<McpAppsConfig>(
  'MCP_APPS_CONFIG',
);

export type McpServerUrls = Record<string, string | (() => string)>;

export const MCP_APPS_SERVER_URL = new InjectionToken<McpServerUrls>(
  'MCP_APPS_SERVER_URL',
);

export function provideMcp(serverUrls: McpServerUrls): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: MCP_APPS_SERVER_URL,
      useValue: serverUrls,
    },
  ]);
}

export function provideMcpApps(config: McpAppsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: MCP_APPS_CONFIG,
      useValue: config,
    },
  ]);
}
