import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { renderDashboardTool } from '../tools/render-dashboard.js';
import { dashboardAgentPrompt } from './dashboard-agent.prompt.js';

export const dashboardAgent = new Agent({
  id: 'dashboardAgent',
  name: 'Flight42 Dashboard Composer',
  instructions: dashboardAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  tools: { renderDashboardTool },
  // The agent's only job is to issue ONE renderDashboard tool call,
  // so a small step budget is plenty.
  defaultOptions: { maxSteps: 3 },
  memory: new Memory(),
});
