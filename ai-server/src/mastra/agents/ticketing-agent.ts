import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import {
  MCPAppsMiddleware,
  type MCPClientConfig,
} from '@ag-ui/mcp-apps-middleware';
import { USE_MCP } from '@flights42/feature-flags';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import {
  RENDER_A2UI_TOOL_NAME,
  renderA2uiTool,
} from '../a2ui/render-a2ui.tool.js';
import { withA2uiInstructions } from '../a2ui/with-a2ui-instructions.js';
import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { hotelAgent } from './hotel-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

const HOTELS_MCP_SERVER: MCPClientConfig = {
  type: 'http',
  url: 'http://127.0.0.1:3002/mcp',
  serverId: 'hotels',
};

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: withA2uiInstructions(ticketingAgentPrompt),
  model,
  defaultOptions,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    [RENDER_A2UI_TOOL_NAME]: renderA2uiTool,
  },
  agents: USE_MCP ? {} : { hotelAgent },
  memory: new Memory(),
});

const MCP_APPS_MIDDLEWARES = USE_MCP
  ? [new MCPAppsMiddleware({ mcpServers: [HOTELS_MCP_SERVER] })]
  : [];

agUiRouteConfig[ticketingAgent.id] = {
  middlewares: [
    ...MCP_APPS_MIDDLEWARES,
    new A2UIMiddleware({ injectA2UITool: false, a2uiToolNames: [] }),
  ],
};
