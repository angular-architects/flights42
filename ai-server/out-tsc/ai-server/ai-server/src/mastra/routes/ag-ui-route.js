import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import { streamSSE } from 'hono/streaming';

import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';
export async function agUiRouteHandler(c) {
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
  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(c, async (sse) => {
    await streamAgentEvents(sse, agent, parsed.input);
  });
}
