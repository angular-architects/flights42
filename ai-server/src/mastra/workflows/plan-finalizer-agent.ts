import type { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

import { modelAdvancedTasks } from '../config.js';
import { planFinalizerAgentPrompt } from './plan-finalizer-agent.prompt.js';

export const planFinalizerAgent = new Agent({
  id: 'planFinalizerAgent',
  name: 'Flight42 Plan Finalizer',
  instructions: planFinalizerAgentPrompt,
  model: modelAdvancedTasks,
  defaultOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: 'high',
      } as OpenAILanguageModelResponsesOptions,
    },
  },
});
