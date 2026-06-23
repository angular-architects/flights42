import process from 'node:process';

import type { ContextWithMastra } from '@mastra/core/server';

import { streamAgUi, streamNative } from './stream.js';

// Set AI_DEMO_AG_UI=1 to stream the AG-UI protocol instead of the native format.
const useAgUI = process.env.AI_DEMO_AG_UI === '1';

const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
};

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  let prompt = '';
  let threadId = '';
  try {
    const body = (await c.req.json()) as {
      prompt?: unknown;
      threadId?: unknown;
    };
    prompt = String(body?.prompt ?? '').trim();
    threadId = String(body?.threadId ?? '').trim();
  } catch {
    prompt = '';
  }

  const agent = c.get('mastra').getAgent('weatherAgent');

  const stream = useAgUI
    ? streamAgUi(agent, prompt, threadId)
    : streamNative(agent, prompt, threadId);

  return new Response(stream, { headers: NDJSON_HEADERS });
}
