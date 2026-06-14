/* eslint-disable @typescript-eslint/no-unused-vars */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

// import { initMcpServer } from '../../../../libs/ag-ui-server/index.js';
import { model } from '../config';
import { bookFlightTool } from '../tools/book-flight';
import { cancelFlightTool } from '../tools/cancel-flight';
import { findBookedFlightsTool } from '../tools/find-booked-flights';
import { hotelAgent } from './hotel-agent';
// import { packageAgent } from './package-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt';
import { travelPlannerAgent } from './travel-planner-agent';

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
