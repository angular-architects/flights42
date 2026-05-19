import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { aggregateDataTool } from '../tools/aggregate-data.js';
import { renderChartTool } from '../tools/render-chart.js';
import { renderDashboardTool } from '../tools/render-dashboard.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { dashboardSlowAgentPrompt } from './dashboard-slow-agent.prompt.js';

// Dashboard agent variant used to measure the cost of LLM-driven tool
// chaining for charts. Instead of asking the server to compile chart
// tiles deterministically (`delayShareChart` / `delaysPerDayChart`), the
// LLM has to chain `searchFlights` → `aggregateData` → `renderChart`
// itself for every chart and then embed the resulting URL in a
// `chartImage` tile.
//
// Same model as the fast `dashboardAgent` so duration differences come
// from the extra round-trips, not from a different model.
export const dashboardSlowAgent = new Agent({
  id: 'dashboardSlowAgent',
  name: 'Flight42 Dashboard Composer (multi-step charts)',
  instructions: dashboardSlowAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  tools: {
    searchFlightsTool,
    aggregateDataTool,
    renderChartTool,
    renderDashboardTool,
  },
  // Chart-heavy prompts can need many round-trips: 1 searchFlights + 1
  // aggregateData + 1 renderChart per chart, plus the final
  // renderDashboard. Example #1 alone has 4 charts → at least ~13 steps.
  defaultOptions: { maxSteps: 30 },
  memory: new Memory(),
});
