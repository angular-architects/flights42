import { Agent } from '@mastra/core/agent';

import { packageTourWorkflow } from '../workflows/package-tour-workflow.js';
import { travelPlannerAgentPrompt } from './travel-planner-agent.prompt.js';

export const travelPlannerAgent = new Agent({
  id: 'travelPlannerAgent',
  name: 'Flight42 Travel Planner',
  instructions: travelPlannerAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  workflows: { packageTourWorkflow },
});
