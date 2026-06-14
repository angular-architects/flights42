/* eslint-disable @typescript-eslint/no-unused-vars */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config';
import { bookFlightTool } from '../tools/book-flight';
import { cancelFlightTool } from '../tools/cancel-flight';
import { findBookedFlightsTool } from '../tools/find-booked-flights';
import { ticketingAgentPrompt } from './ticketing-agent.prompt';

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
