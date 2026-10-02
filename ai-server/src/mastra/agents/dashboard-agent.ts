import { Agent } from '@mastra/core/agent';

import { defaultOptions, model } from '../config.js';
import { renderDashboard } from '../tools/render-dashboard.js';
import { dashboardAgentPrompt } from './dashboard-agent.prompt.js';

export const dashboardAgent = new Agent({
  id: 'dashboardAgent',
  name: 'Flight42 Dashboard Composer',
  instructions: dashboardAgentPrompt,
  model,
  tools: { renderDashboard },
  defaultOptions: { ...defaultOptions, maxSteps: 1 },
  // memory: new Memory(),
});
