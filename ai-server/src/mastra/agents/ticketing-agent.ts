// import { initMcpServer } from '@internal/ag-ui-server';
import { renderA2uiTool } from '@internal/ag-ui-server';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

// const hotelsMcpTools = await initMcpServer({
//   serverId: 'hotels',
//   url: new URL('http://127.0.0.1:3002/mcp'),
// });

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ticketingAgentPrompt,
  model,
  tools: {
    findBookedFlightsTool,
    // bookFlightTool / cancelFlightTool are client-side human-in-the-loop tools
    // (registered via CopilotKit's registerHumanInTheLoop); the passenger picks
    // a payment method / confirms in the rendered card, and the client executes
    // the mutation via the /bookings REST route.
    renderA2uiTool,
    // ...hotelsMcpTools,
  },
  // Server-side thread memory: the client (useServerMemory) only sends the
  // delta each run, so the thread supplies the earlier context without
  // duplication. Planning shares this thread via the same client HttpAgent.
  memory: new Memory(),
});
