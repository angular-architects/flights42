import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { getExtendedLocalAgent } from '../../../../libs/ag-ui-server/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';

export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const agentId = c.req.param('agentId');
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: agentId ?? '',
    resourceId: agentId ?? '',
    requestContext,
  });

  return streamSSE(c, async (sse) => {
    await streamAgentEvents(sse, agent, parsed.input);
  });
}
