import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';

import { ticketingAgent } from './agents/ticketing-agent.js';
import { agUiRouteHandler } from './routes/ag-ui-route.js';
import {
  bookFlightHandler,
  cancelFlightHandler,
  listBookingsHandler,
} from './routes/bookings-route.js';

export const mastra = new Mastra({
  agents: { ticketingAgent },
  storage: new LibSQLStore({
    id: 'flights42-storage',
    url: 'file:./flights42.db',
  }),
  logger: new PinoLogger({
    name: 'Flights42',
    level: 'info',
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
      registerApiRoute('/ag-ui/:agentId', {
        method: 'POST',
        handler: agUiRouteHandler,
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
    ],
  },
});
