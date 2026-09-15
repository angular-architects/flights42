import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
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

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: withA2uiInstructions(ticketingAgentPrompt),
  model,
  defaultOptions: {
    ...defaultOptions,
    delegation: { includeSubAgentToolResultsInModelContext: true },
  },
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    [RENDER_A2UI_TOOL_NAME]: renderA2uiTool,
  },
  agents: { hotelAgent },
  memory: new Memory(),
});

agUiRouteConfig[ticketingAgent.id] = {
  middlewares: [
    new A2UIMiddleware({ injectA2UITool: false, a2uiToolNames: [] }),
  ],
};
