import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const mcpAppsSnapshotContentSchema = z.looseObject({
  serverId: z.string(),
  resourceUri: z.string(),
  result: CallToolResultSchema,
  toolInput: z.record(z.string(), z.unknown()),
});

export type McpAppsSnapshotContent = z.infer<
  typeof mcpAppsSnapshotContentSchema
>;
