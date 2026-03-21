import { Agent } from '@mastra/core/agent';

import { ticketingSystemPrompt } from '../prompts/system-prompt.js';
import { getBookedFlightsTool as getBookedFlights } from '../tools/get-booked-flights.tool.js';

export const ticketingAgent = new Agent({
  id: 'ticketing-agent',
  name: 'Ticketing Agent',
  instructions: ticketingSystemPrompt,
  model: 'openai/gpt-5.4',
  tools: { getBookedFlights },
});
