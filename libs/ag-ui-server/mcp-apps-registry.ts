import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';

export interface McpAppToolMetadata {
  serverId: string;
  resourceUri: string;
}

export interface McpAppsConfig {
  serverId: string;
  url: URL;
}

interface McpToolMeta {
  ui?: { resourceUri?: unknown };
  'ui/resourceUri'?: unknown;
}

const mcpAppsRegistry = new Map<string, McpAppToolMetadata>();

export function getMcpAppToolMetadata(
  toolName: string,
): McpAppToolMetadata | undefined {
  return mcpAppsRegistry.get(toolName);
}

export async function initMcpAppsRegistry(
  config: McpAppsConfig,
): Promise<void> {
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

function toMcpAppToolMetadata(
  serverId: string,
  tool: McpTool,
): [string, McpAppToolMetadata] | null {
  const meta = tool._meta as McpToolMeta | undefined;
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
