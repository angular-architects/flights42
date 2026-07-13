import { Agent } from '@mastra/core/agent';

import { model } from '../config.js';
import { executeJavaScriptTool } from '../tools/execute-javascript.js';
import { reportingAgentPrompt } from './reporting-agent.prompt.js';

export const reportingAgent = new Agent({
  id: 'reportingAgent',
  name: 'Flight42 Reporting Assistant',
  instructions: reportingAgentPrompt,
  model: model,
  tools: {
    executeJavaScript: executeJavaScriptTool,
  },
});
