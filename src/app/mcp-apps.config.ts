import type {
  McpAppsConfig,
  StyleVariables,
} from './domains/shared/util-copilotkit/mcp-apps/mcp-apps.provider';

export const mcpAppsConfig: McpAppsConfig = {
  hostInfo: {
    name: 'Flights42 MCP Host',
    version: '1.0.0',
  },
  hostContext: {
    displayMode: 'inline',
    theme: 'light',
    styles: {
      variables: {
        '--color-ring-primary': '#3f51b5',
      } as StyleVariables,
    },
  },
};
