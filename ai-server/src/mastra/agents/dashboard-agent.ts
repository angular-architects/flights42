import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import {
  addCustomCatalogInstructions,
  renderA2uiTool,
} from '../../../../libs/ag-ui-server/index.js';
import { aggregateDataTool } from '../tools/aggregate-data.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { renderChartTool } from '../tools/render-chart.js';
import { renderFlightChartTool } from '../tools/render-flight-chart.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { searchHotelsTool } from '../tools/search-hotels.js';
import { searchRentalCarsTool } from '../tools/search-rental-cars.js';
import { weatherForecastTool } from '../tools/weather-forecast.js';
import { dashboardAgentPrompt } from './dashboard-agent.prompt.js';

export const dashboardAgent = new Agent({
  id: 'dashboardAgent',
  name: 'Flight42 Dashboard Composer',
  instructions: addCustomCatalogInstructions({
    systemInstructions: dashboardAgentPrompt,
    log: false,
  }),
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
    renderA2uiTool,
  },
  // A typical dashboard request issues many tool calls before the final
  // `renderA2uiTool`: searchFlights, several aggregateData runs, one or two
  // renderChart calls, optionally weatherForecast and findBookedFlights, and
  // finally renderA2uiTool. Mastra's default step limit is 5, which makes
  // the agent stop right before the rendering step and produces an empty
  // dashboard. `defaultOptions` is the option bag for the new
  // `agent.stream()` / `agent.generate()` APIs in Mastra >= 1.x; the
  // `*Legacy` variants only apply to `streamLegacy()` / `generateLegacy()`
  // and are silently ignored by the AG-UI route.
  defaultOptions: { maxSteps: 20 },
  memory: new Memory(),
});
