import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ticketingAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  tools: { findBookedFlightsTool },
  memory: new Memory(),
});
