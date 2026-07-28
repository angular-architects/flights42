import type { MCPClientConfig } from '@ag-ui/mcp-apps-middleware';
import type { MastraModelConfig } from '@mastra/core/llm';

import { USE_MCP } from '../../../libs/feature-flags/feature-flags.js';

/**
 * Central model used by all Mastra agents in this project.
 * Change this single value to switch the model everywhere.
 */
export const model: MastraModelConfig = 'openai/gpt-5.4-mini';
export const modelAdvancedTasks: MastraModelConfig = 'openai/gpt-5.5';

export const HOTELS_MCP_SERVER_URL = 'http://127.0.0.1:3002/mcp';

export const MCP_APPS_SERVERS: MCPClientConfig[] = USE_MCP
  ? [
      {
        type: 'http',
        url: HOTELS_MCP_SERVER_URL,
        serverId: 'hotels',
      },
    ]
  : [];

// export const model: MastraModelConfig = 'google/gemini-flash-latest'; // Gemini Flash
