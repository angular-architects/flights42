import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { streamAgentEvents } from './ag-ui-stream.js';
import { parseRunAgentInput, toAgUiAgent } from './route-utils.js';

// Run Mastra agent for agentId and stream its AG-UI events.
// Registered for POST /ag-ui/:agentId in ../index.ts.
export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  // Read agentId from the URL path.
  const agentId = c.req.param('agentId') ?? '';

  // Get Mastra instance and RequestContext.
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  // Parse JSON payload as RunAgentInput; answer 400 if invalid.
  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { input } = parsed;

  // Look up the Mastra agent for agentId.
  const mastraAgent = mastraInstance.getAgent(agentId);
  if (!mastraAgent) {
    return c.json(
      { error: 'not_found', message: `Agent ${agentId} not found` },
      404,
    );
  }

  // Wrap Mastra agent in AG-UI agent.
  const agUiAgent = toAgUiAgent({
    agentId,
    mastraAgent,
    input,
    requestContext,
    abortSignal: c.req.raw.signal,
  });

  // Respond with a Server-Sent Events stream.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      // Run AG-UI agent and send each event as SSE message.
      await streamAgentEvents(sse, agUiAgent, input);
    },
  );
}
