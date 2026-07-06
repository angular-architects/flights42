import type { RunAgentInput } from '@ag-ui/core';
import type { ContextWithMastra } from '@mastra/core/server';

import { SSE_HEADERS, streamAgUi } from './stream.js';

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  let input: RunAgentInput;
  try {
    input = (await c.req.json()) as RunAgentInput;
  } catch {
    return c.json(
      { error: 'invalid_request', message: 'Invalid JSON body' },
      400,
    );
  }

  if (!input?.threadId || !input?.runId || !Array.isArray(input.messages)) {
    return c.json(
      {
        error: 'invalid_request',
        message: 'Missing threadId, runId, or messages',
      },
      400,
    );
  }

  const agent = c.get('mastra').getAgent('weatherAgent');
  const stream = streamAgUi(agent, input);

  return new Response(stream, { headers: { ...SSE_HEADERS } });
}
