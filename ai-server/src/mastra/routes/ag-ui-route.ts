import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { streamAgentEvents } from './ag-ui-stream.js';
import { parseRunAgentInput, toAgUiAgent } from './route-utils.js';

export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const agentId = c.req.param('agentId') ?? '';
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { input } = parsed;

  const mastraAgent = mastraInstance.getAgent(agentId);
  if (!mastraAgent) {
    return c.json(
      { error: 'not_found', message: `Agent ${agentId} not found` },
      404,
    );
  }

  const agUiAgent = toAgUiAgent({
    agentId,
    mastraAgent,
    input,
    requestContext,
    abortSignal: c.req.raw.signal,
  });

  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamAgentEvents(sse, agUiAgent, input);
    },
  );
}
