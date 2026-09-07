import type { MCPClientConfig } from '@ag-ui/mcp-apps-middleware';

export interface AgUiRouteConfig {
  mcpServers?: readonly MCPClientConfig[];
  a2ui?: boolean;
  untilIdle?: boolean;
}

export const agUiRouteConfig: Record<string, AgUiRouteConfig> = {};
