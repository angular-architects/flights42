import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model, modelAdvancedTasks } from '../config.js';
import { hotelAgent } from './hotel-agent.js';
import { ticketingAgent } from './ticketing-agent.js';
import { travelRefinementAgentPrompt } from './travel-refinement-agent.prompt.js';

export const travelRefinementAgent = new Agent({
  id: 'travelRefinementAgent',
  name: 'Flight42 Travel Refinement',
  instructions: travelRefinementAgentPrompt,
  model: modelAdvancedTasks,
  agents: { ticketingAgent, hotelAgent },
  memory: new Memory(),
  defaultOptions: {
    providerOptions: {
      openai: { reasoningEffort: 'low', textVerbosity: 'low' },
    },
  },
});
