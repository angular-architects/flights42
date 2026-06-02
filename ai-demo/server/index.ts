import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';

import { weatherAgent } from './agent';
import { chatRouteHandler } from './chat-route';

const port = Number(process.env.AI_DEMO_PORT ?? 4555);

export const mastra = new Mastra({
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
