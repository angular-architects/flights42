import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import { Agent } from '@mastra/core/agent';

import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';
import { RenderDashboardMiddleware } from '../routes/dashboard-utils.js';
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

agUiRouteConfig[dashboardAgent.id] = {
  middlewares: [
    new RenderDashboardMiddleware(),
    new A2UIMiddleware({ a2uiToolNames: [] }),
  ],
};
