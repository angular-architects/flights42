import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { modelAdvancedTasks } from '../config.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingPlanAgentPrompt } from './ticketing-plan-agent.prompt.js';

export const ticketingPlanAgent = new Agent({
  id: 'ticketingPlanAgent',
  name: 'Flight42 Co-Planner',
  instructions: ticketingPlanAgentPrompt,
  model: modelAdvancedTasks,
  defaultOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: 'low',
        textVerbosity: 'low',
      },
    },
  },
  tools: {
    findBookedFlightsTool,
  },
  // Shares the ticketing conversation thread (same client HttpAgent + threadId).
  memory: new Memory(),
});
