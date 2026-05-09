import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import {
  catalogToPromptSection,
  renderA2uiDataTool,
} from '../../../../libs/ag-ui-server/index.js';
import { aggregateDataTool } from '../tools/aggregate-data.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { renderChartTool } from '../tools/render-chart.js';
import { renderFlightChartTool } from '../tools/render-flight-chart.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { searchHotelsTool } from '../tools/search-hotels.js';
import { searchRentalCarsTool } from '../tools/search-rental-cars.js';
import { weatherForecastTool } from '../tools/weather-forecast.js';
import { dashboardDataAgentPrompt } from './dashboard-data-agent.prompt.js';

export const DASHBOARD_DATA_REFRESH_CONTEXT_KEY = 'dashboard-data-refresh';

export interface DashboardDataRefreshContext {
  surfaceId: string;
  dataModelOps: readonly unknown[];
}

interface AgUiRuntimeContext {
  context?: { description?: string; value?: string }[];
}

interface InstructionsParams {
  requestContext: { get: (key: string) => unknown };
}

function buildRefreshContextSection(
  refresh: DashboardDataRefreshContext | undefined,
): string {
  if (!refresh) {
    return '';
  }

  const opsJson = JSON.stringify(refresh.dataModelOps, null, 2);

  return [
    '## Refresh context',
    '',
    `surfaceId: \`${refresh.surfaceId}\``,
    '',
    'Cached `updateDataModel` operations from the original turn. Re-run the',
    'data tools and emit one `renderA2uiDataTool` call whose `messages`',
    'array uses the SAME paths with freshly computed values:',
    '',
    '```json',
    opsJson,
    '```',
  ].join('\n');
}

function buildDataAgentInstructions({
  requestContext,
}: InstructionsParams): string {
  const refresh = requestContext.get(DASHBOARD_DATA_REFRESH_CONTEXT_KEY) as
    | DashboardDataRefreshContext
    | undefined;
  const agUi = requestContext.get('ag-ui') as AgUiRuntimeContext | undefined;

  const sections = [
    dashboardDataAgentPrompt,
    buildRefreshContextSection(refresh),
    catalogToPromptSection(agUi?.context),
  ].filter((section) => section.length > 0);

  return sections.join('\n\n');
}

export const dashboardDataAgent = new Agent({
  id: 'dashboardDataAgent',
  name: 'Flight42 Dashboard Data Refresher',
  instructions: buildDataAgentInstructions,
  model: 'openai/gpt-5.3-chat-latest',
  tools: {
    searchFlightsTool,
    aggregateDataTool,
    weatherForecastTool,
    findBookedFlightsTool,
    renderChartTool,
    renderFlightChartTool,
    searchRentalCarsTool,
    searchHotelsTool,
    renderA2uiDataTool,
  },
  // Same rationale as the full dashboard agent: a single refresh turn may
  // batch several data tool calls before the final renderA2uiDataTool, so
  // the default step limit of 5 is too low.
  defaultOptions: { maxSteps: 20 },
  memory: new Memory(),
});
