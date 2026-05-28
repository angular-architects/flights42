import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import {
  RENDER_DASHBOARD_TOOL_NAME,
  renderDashboardTool,
} from '../tools/render-dashboard.js';
import { dashboardAgentPrompt } from './dashboard-agent.prompt.js';

export const dashboardAgent = new Agent({
  id: 'dashboardAgent',
  name: 'Flight42 Dashboard Composer',
  instructions: dashboardAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  // The object key — not the tool's `id` — is what Mastra sends to the
  // LLM as the function name. Keeping them aligned with
  // `RENDER_DASHBOARD_TOOL_NAME` ensures the route handler's
  // `TOOL_CALL_*` filter matches the agent's emitted events.
  tools: { [RENDER_DASHBOARD_TOOL_NAME]: renderDashboardTool },
  // The agent's only job is to issue ONE renderDashboard tool call;
  // the route intercepts its args and renders the surface. We don't
  // need a follow-up LLM step to process the (intentionally empty)
  // tool result, so the loop ends after step 1.
  defaultOptions: { maxSteps: 1 },
  memory: new Memory(),
});
