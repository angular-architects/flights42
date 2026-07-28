import { MCPAppsConfig } from '@copilotkit/angular/mcp-apps';

export const mcpAppsConfig: MCPAppsConfig = {
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
      },
    },
  },
};
