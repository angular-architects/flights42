import { Agent } from '@mastra/core/agent';

import { generativeUiAgentPrompt } from './generative-ui-agent.prompt.js';

export const generativeUiAgent = new Agent({
  id: 'generativeUiAgent',
  name: 'Flight42 Generative UI Composer',
  instructions: generativeUiAgentPrompt,
  model: 'openai/gpt-5.6-terra',
  defaultOptions: {
    maxSteps: 1,
    providerOptions: { openai: { reasoningEffort: 'high' } },
  },
});
