import { Agent } from '@mastra/core/agent';

import { packageTourWorkflow } from '../workflows/package-tour-workflow.js';
import { packageAgentPrompt } from './package-agent.prompt.js';

export const packageAgent = new Agent({
  id: 'packageAgent',
  name: 'Flight42 Package Agent',
  instructions: packageAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  workflows: { packageTourWorkflow },
});
