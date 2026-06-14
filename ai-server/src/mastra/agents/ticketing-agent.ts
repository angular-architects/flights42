/* eslint-disable @typescript-eslint/no-unused-vars */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

// import { initMcpServer } from '@internal/ag-ui-server';
import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { hotelAgent } from './hotel-agent.js';
// import { packageAgent } from './package-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';
import { travelPlannerAgent } from './travel-planner-agent.js';

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ticketingAgentPrompt,
  model,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
  },
  // agents: { travelPlannerAgent, hotelAgent },
  memory: new Memory(),
});
