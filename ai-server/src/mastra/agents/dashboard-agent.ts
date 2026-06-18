import { Agent } from '@mastra/core/agent';

import { model } from '../config.js';
import {
  RENDER_DASHBOARD_TOOL_NAME,
  renderDashboardTool,
} from '../tools/render-dashboard.js';
import { dashboardAgentPrompt } from './dashboard-agent.prompt.js';

export const dashboardAgent = new Agent({
  id: 'dashboardAgent',
  name: 'Flight42 Dashboard Composer',
  instructions: dashboardAgentPrompt,
  model,
  tools: { [RENDER_DASHBOARD_TOOL_NAME]: renderDashboardTool },
  defaultOptions: { maxSteps: 1 },
  // memory: new Memory(),
});
