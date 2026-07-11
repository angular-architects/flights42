// import { initMcpServer } from '@internal/ag-ui-server';
import {
  addCustomCatalogInstructions,
  renderA2uiTool,
} from '@internal/ag-ui-server';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

// const hotelsMcpTools = await initMcpServer({
//   serverId: 'hotels',
//   url: new URL('http://127.0.0.1:3002/mcp'),
// });

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  // The base prompt is extended per request with the A2UI custom-catalog
  // components the client forwards via the AG-UI context, so the agent can
  // render them through renderA2uiTool. Falls back to the base prompt when no
  // catalog is forwarded.
  instructions: addCustomCatalogInstructions({
    systemInstructions: ticketingAgentPrompt,
  }),
  model,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    renderA2uiTool,
    // ...hotelsMcpTools,
  },
  // Server-side thread memory: the client (useServerMemory) only sends the
  // delta each run, so the thread supplies the earlier context without
  // duplication. Planning shares this thread via the same client HttpAgent.
  memory: new Memory(),
});
