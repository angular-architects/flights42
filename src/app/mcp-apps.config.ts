import type {
  McpAppsConfig,
  StyleVariables,
} from './domains/shared/ui-agent/widgets/mcp-apps.provider';

export const mcpAppsConfig: McpAppsConfig = {
  hostInfo: {
    name: 'Flights42 MCP Host',
    version: '1.0.0',
  },
  hostCapabilities: {
    openLinks: {},
    serverTools: {},
    logging: {},
  },
  hostContext: {
    platform: 'web',
    displayMode: 'inline',
    availableDisplayModes: ['inline'],
    styles: {
      variables: {
        '--color-ring-primary': '#3f51b5',
      } as StyleVariables,
    },
  },
};
