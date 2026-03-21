import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';

import { agUiRouteHandler } from './ag-ui/ag-ui-route.js';
import { ticketingAgent } from './agents/ticketing-agent.js';

const openAiApiKey = process.env['OPENAI_API_KEY'];

if (!openAiApiKey) {
  throw new Error('OPENAI_API_KEY is not set');
}

export const mastra = new Mastra({
  server: {
    host: 'localhost',
    port: 3001,
    cors: {
      origin: '*',
    },
    apiRoutes: [
      registerApiRoute('/ag-ui/:agentId', {
        method: 'POST',
        handler: agUiRouteHandler,
      }),
    ],
  },
  agents: {
    ticketingAgent,
  },
  storage: new LibSQLStore({
    id: 'flights42-storage',
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Flights42 Mastra',
    level: 'info',
  }),
});
