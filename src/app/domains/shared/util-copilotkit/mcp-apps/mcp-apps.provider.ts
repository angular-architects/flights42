import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import type {
  McpUiHostCapabilities,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type {
  CallToolResult,
  Implementation,
} from '@modelcontextprotocol/sdk/types.js';

export type StyleVariables = NonNullable<
  McpUiHostContext['styles']
>['variables'];

export interface McpAppsConfig {
  hostInfo: Implementation;
  hostCapabilities: McpUiHostCapabilities;
  hostContext: McpUiHostContext;
}

/**
 * Content of an `mcp-apps` activity snapshot emitted by the server. Drives the
 * MCP App iframe host: `resourceUri` is loaded as HTML, `toolInput` and
 * `result` are forwarded to the app over the bridge.
 */
export interface McpAppsSnapshotContent {
  serverId: string;
  resourceUri: string;
  result: CallToolResult;
  toolInput: Record<string, unknown>;
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
  ]);
}
