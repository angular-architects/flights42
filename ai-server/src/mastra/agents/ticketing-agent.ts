import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

// import { initMcpServer } from '@internal/ag-ui-server';
import { model } from '../config.js';
import { blockedWordsGuard } from '../processors/blocked-words-guard.js';
import { offTopicGuard } from '../processors/off-topic-guard.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { getPassengerTool } from '../tools/get-passenger.js';
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
    bookFlightTool,
    cancelFlightTool,
    getPassengerTool,
    // ...hotelsMcpTools,
  },
  inputProcessors: [blockedWordsGuard, offTopicGuard],
  outputProcessors: [],
  memory: new Memory(),
});
