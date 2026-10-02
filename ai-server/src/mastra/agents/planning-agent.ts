import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { defaultOptions, modelAdvancedTasks } from '../config.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { planningAgentPrompt } from './planning-agent.prompt.js';

export const planningAgent = new Agent({
  id: 'planningAgent',
  name: 'Flight42 Co-Planner',
  instructions: planningAgentPrompt,
  model: modelAdvancedTasks,
  defaultOptions,
  tools: {
    findBookedFlightsTool,
  },
  memory: new Memory(),
});
