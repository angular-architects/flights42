import type { Tool as MastraTool } from '@mastra/core/tools';
import { MCPClient } from '@mastra/mcp';

import {
  initMcpAppsRegistry,
  type McpAppsConfig,
} from './mcp-apps-registry.js';

export async function initMcpServer(
  config: McpAppsConfig,
): Promise<Record<string, MastraTool>> {
  await initMcpAppsRegistry(config);

  return new MCPClient({
    id: `${config.serverId}-mcp-client`,
    servers: {
      [config.serverId]: {
        url: config.url,
      },
    },
  }).listTools();
}
