import { type RunAgentInput } from '@ag-ui/core';
import express from 'express';

import { FlightWeatherAgent } from './agent.js';

const app = express();
const port = Number(process.env.AG_UI_DEMO_PORT ?? 3331);

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/agent', (request, response) => {
  const input = request.body as RunAgentInput;

  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();

  const agent = new FlightWeatherAgent();
  const subscription = agent.run(input).subscribe({
    next: (event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    error: (error: unknown) => {
      console.error('AG-UI demo agent error:', error);
      response.write(
        `data: ${JSON.stringify({
          type: 'ERROR',
          message: 'The AG-UI demo agent failed to process the request.',
        })}\n\n`,
      );
      response.end();
    },
    complete: () => {
      response.end();
    },
  });

  response.on('close', () => {
    subscription.unsubscribe();
  });
});

const server = app.listen(port, () => {
  console.log(`AG-UI demo server listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('AG-UI demo server failed to start:', error);
});
