import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface McpAppToolMetadata {
  serverId: string;
  resourceUri: string;
}

/**
 * Content of an `mcp-apps` activity snapshot sent to the client. Kept in sync
 * with the identical schema in the Angular app by hand.
 */
export const mcpAppsSnapshotContentSchema = z.looseObject({
  serverId: z.string(),
  resourceUri: z.string(),
  result: CallToolResultSchema,
  toolInput: z.record(z.string(), z.unknown()),
});

export type McpAppsSnapshotContent = z.infer<
  typeof mcpAppsSnapshotContentSchema
>;

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
