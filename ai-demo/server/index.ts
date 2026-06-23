import process from 'node:process';

import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { InMemoryStore } from '@mastra/core/storage';

import { weatherAgent } from './agent.js';
import { chatRouteHandler } from './chat-route.js';

const port = Number(process.env.AI_DEMO_PORT ?? 4555);

export const mastra = new Mastra({
  // In-memory storage: conversation history lives only for the process lifetime.
  storage: new InMemoryStore(),
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
