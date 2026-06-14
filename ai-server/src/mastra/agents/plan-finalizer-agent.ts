import { Agent } from '@mastra/core/agent';

import { model } from '../config.js';
import { planFinalizerAgentPrompt } from './plan-finalizer-agent.prompt.js';

export const planFinalizerAgent = new Agent({
  id: 'planFinalizerAgent',
  name: 'Flight42 Plan Finalizer',
  instructions: planFinalizerAgentPrompt,
  model,
});
