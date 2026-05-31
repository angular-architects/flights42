import express from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { streamAgUi, streamNative } from './stream.js';

const port = Number(process.env.AI_DEMO_PORT ?? 4555);

const app = express();
app.use(express.json());

app.post('/chat', async (request, response) => {
  const prompt = String(request.body?.prompt ?? '').trim();

  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');

  // await streamNative(prompt, response);
  await streamAgUi(prompt, response);

  response.end();
});

app.listen(port, () => {
  console.log(`AI-Demo server listening on http://localhost:${port}`);
});
