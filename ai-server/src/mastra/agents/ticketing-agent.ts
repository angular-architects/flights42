import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

// import { initMcpServer } from '../../../../libs/ag-ui-server/index.js';
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
  instructions: ticketingAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    // ...hotelsMcpTools,
  },
  memory: new Memory(),
});
