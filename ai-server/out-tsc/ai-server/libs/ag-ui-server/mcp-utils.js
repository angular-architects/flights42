import { MCPClient } from '@mastra/mcp';
import { initMcpAppsRegistry } from './mcp-apps-registry.js';
export async function initMcpServer(config) {
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
