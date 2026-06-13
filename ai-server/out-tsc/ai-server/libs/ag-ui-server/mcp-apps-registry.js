import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const mcpAppsRegistry = new Map();
export function getMcpAppToolMetadata(toolName) {
  return mcpAppsRegistry.get(toolName);
}
export async function initMcpAppsRegistry(config) {
  const client = new Client({
    name: `${config.serverId}-mcp-apps-metadata-client`,
    version: '1.0.0',
  });
  await client.connect(new StreamableHTTPClientTransport(config.url));
  try {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      const entry = toMcpAppToolMetadata(config.serverId, tool);
      if (!entry) {
        continue;
      }
      mcpAppsRegistry.set(entry[0], entry[1]);
    }
  } finally {
    await client.close();
  }
}
function toMcpAppToolMetadata(serverId, tool) {
  const meta = tool._meta;
  const resourceUri =
    typeof meta?.ui?.resourceUri === 'string'
      ? meta.ui.resourceUri
      : typeof meta?.['ui/resourceUri'] === 'string'
        ? meta['ui/resourceUri']
        : undefined;
  if (!resourceUri) {
    return null;
  }
  return [
    `${serverId}_${tool.name}`,
    {
      serverId,
      resourceUri,
    },
  ];
}
