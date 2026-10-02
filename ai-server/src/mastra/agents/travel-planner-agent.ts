import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';
import { packageTourWorkflow } from '../workflows/package-tour-workflow.js';
import { travelPlannerAgentPrompt } from './travel-planner-agent.prompt.js';

export const travelPlannerAgent = new Agent({
  id: 'travelPlannerAgent',
  name: 'Flight42 Travel Planner',
  instructions: travelPlannerAgentPrompt,
  model,
  workflows: { packageTourWorkflow },
  memory: new Memory(),
  backgroundTasks: {
    tools: {
      packageTourWorkflow: { enabled: true, timeoutMs: 600_000 },
    },
  },
  defaultOptions: {
    providerOptions: {
      openai: {
        ...defaultOptions.providerOptions.openai,
        reasoningEffort: 'medium',
      },
    },
  },
});

agUiRouteConfig[travelPlannerAgent.id] = { untilIdle: true };
