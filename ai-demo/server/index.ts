import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { InMemoryStore } from '@mastra/core/storage';

import { weatherAgent } from './agent.js';
import { chatRouteHandler } from './chat-route.js';

export const mastra = new Mastra({
  storage: new InMemoryStore(),
  agents: { weatherAgent },
  server: {
    port: 4555,
    cors: {
      origin: '*',
    },
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        handler: chatRouteHandler,
      }),
    ],
  },
});
