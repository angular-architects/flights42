import { Agent } from '@mastra/core/agent';

import { modelAdvancedTasks } from '../config.js';
import { packageTourWorkflow } from '../workflows/package-tour-workflow.js';
import { travelPlannerAgentPrompt } from './travel-planner-agent.prompt.js';

export const travelPlannerAgent = new Agent({
  id: 'travelPlannerAgent',
  name: 'Flight42 Travel Planner',
  instructions: travelPlannerAgentPrompt,
  model: modelAdvancedTasks,
  workflows: { packageTourWorkflow },
});
