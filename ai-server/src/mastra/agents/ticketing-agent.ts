/* eslint-disable @typescript-eslint/no-unused-vars */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config';
import { bookFlightTool } from '../tools/book-flight';
import { cancelFlightTool } from '../tools/cancel-flight';
import { findBookedFlightsTool } from '../tools/find-booked-flights';
import { searchFlightsTool } from '../tools/search-flights';
import { ticketingAgentPrompt } from './ticketing-agent.prompt';
import { hotelAgent } from './hotel-agent';

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
  // agents: { hotelAgent },
  memory: new Memory(),
});
