import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import {
  MCPAppsMiddleware,
  type MCPClientConfig,
} from '@ag-ui/mcp-apps-middleware';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { addCustomCatalogInstructions } from '../a2ui/add-custom-catalog-instructions.js';
import { renderA2uiTool } from '../a2ui/render-a2ui.tool.js';
import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

const HOTELS_MCP_SERVER: MCPClientConfig = {
  type: 'http',
  url: 'http://127.0.0.1:3002/mcp',
  serverId: 'hotels',
};

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: addCustomCatalogInstructions({
    systemInstructions: ticketingAgentPrompt,
  }),
  model,
  defaultOptions,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    renderA2uiTool,
  },
  memory: new Memory(),
});

agUiRouteConfig[ticketingAgent.id] = {
  middlewares: [
    new MCPAppsMiddleware({ mcpServers: [HOTELS_MCP_SERVER] }),
    new A2UIMiddleware({ injectA2UITool: false }),
  ],
};
