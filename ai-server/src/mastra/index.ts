import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import {
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';

import { checkinAgent } from './agents/checkin-agent.js';
import { dashboardAgent } from './agents/dashboard-agent.js';
import { generativeUiAgent } from './agents/generative-ui-agent.js';
import { hotelAgent } from './agents/hotel-agent.js';
import { packageAgent } from './agents/package-agent.js';
import { planningAgent } from './agents/planning-agent.js';
import { reportingAgent } from './agents/reporting-agent.js';
import { ticketingAgent } from './agents/ticketing-agent.js';
import { travelPlannerAgent } from './agents/travel-planner-agent.js';
import { travelRefinementAgent } from './agents/travel-refinement-agent.js';
import { agUiRouteHandler } from './routes/ag-ui-route.js';
import {
  bookFlightHandler,
  cancelFlightHandler,
  listBookingsHandler,
} from './routes/bookings-route.js';
import { getChartHandler } from './routes/charts-route.js';
import { dashboardAgUiRouteHandler } from './routes/dashboard-ag-ui-route.js';
import { searchFlightsHandler } from './routes/flights-route.js';
import { generativeUiAgUiRouteHandler } from './routes/generative-ui-ag-ui-route.js';
import { getDashboardImageHandler } from './routes/images-route.js';
import { packageTourWorkflow } from './workflows/package-tour-workflow.js';

export const mastra = new Mastra({
  agents: {
    ticketingAgent,
    planningAgent,
    packageAgent,
    hotelAgent,
    travelPlannerAgent,
    travelRefinementAgent,
    reportingAgent,
    checkinAgent,
    dashboardAgent,
    generativeUiAgent,
  },
  workflows: { packageTourWorkflow },
  storage: new LibSQLStore({
    id: 'flights42-storage',
    url: 'file:./flights42.db',
  }),
  logger: new PinoLogger({
    name: 'Flights42',
    level: 'info',
  }),
  // Persists agent/tool/workflow spans into the LibSQL store so Mastra
  // Studio's Observability tab can show traces. `realtime` flushes each
  // event immediately — recommended for local dev with LibSQL per
  // https://mastra.ai/reference/storage/libsql#observability.
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'flights42',
        exporters: [new DefaultExporter({ strategy: 'realtime' })],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  server: {
    port: 3001,
    host: 'localhost',
    cors: {
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    },
    apiRoutes: [
      registerApiRoute('/ag-ui/dashboardAgent', {
        method: 'POST',
        handler: dashboardAgUiRouteHandler,
      }),
      registerApiRoute('/ag-ui/generativeUiAgent', {
        method: 'POST',
        handler: generativeUiAgUiRouteHandler,
      }),
      registerApiRoute('/ag-ui/:agentId', {
        method: 'POST',
        handler: agUiRouteHandler,
      }),
      registerApiRoute('/flights', {
        method: 'GET',
        handler: searchFlightsHandler,
      }),
      registerApiRoute('/bookings', {
        method: 'GET',
        handler: listBookingsHandler,
      }),
      registerApiRoute('/bookings/:flightId', {
        method: 'POST',
        handler: bookFlightHandler,
      }),
      registerApiRoute('/bookings/:flightId', {
        method: 'DELETE',
        handler: cancelFlightHandler,
      }),
      registerApiRoute('/charts/:id', {
        method: 'GET',
        handler: getChartHandler,
      }),
      registerApiRoute('/images/:category/:filename', {
        method: 'GET',
        handler: getDashboardImageHandler,
      }),
    ],
  },
});
