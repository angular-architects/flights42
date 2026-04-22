import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { packageTourWorkflow } from '../workflows/package-tour-workflow.js';
import { packagePlannerAgentPrompt } from './package-planner-agent.prompt.js';

export const packagePlannerAgent = new Agent({
  id: 'packagePlannerAgent',
  name: 'Flight42 Package Planner',
  instructions: packagePlannerAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  workflows: { packageTourWorkflow },
  memory: new Memory(),
});
