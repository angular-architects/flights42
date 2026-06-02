import type { ContextWithMastra } from '@mastra/core/server';

import { streamAgUi, streamNative } from './stream.js';

type Mode = 'native' | 'ag-ui';
// Switch to 'ag-ui' to stream the AG-UI protocol instead of the native format.
const mode = 'native' as Mode;

const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
};

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  let prompt = '';
  try {
    const body = (await c.req.json()) as { prompt?: unknown };
    prompt = String(body?.prompt ?? '').trim();
  } catch {
    prompt = '';
  }

  const agent = c.get('mastra').getAgent('weatherAgent');

  const stream =
    mode === 'ag-ui' ? streamAgUi(agent, prompt) : streamNative(agent, prompt);

  return new Response(stream, { headers: NDJSON_HEADERS });
}
