import process from 'node:process';

import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore } from '@mastra/libsql';

import { weatherAgent } from './agent.js';
import { chatRouteHandler } from './chat-route.js';

const port = Number(process.env.AI_DEMO_PORT ?? 4555);

export const mastra = new Mastra({
  storage: new LibSQLStore({ id: 'memory', url: ':memory:' }),
  agents: { weatherAgent },
  server: {
    port,
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        handler: chatRouteHandler,
      }),
    ],
  },
});
