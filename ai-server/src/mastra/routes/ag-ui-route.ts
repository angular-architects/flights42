import type { RunAgentInput } from '@ag-ui/client';
import { MastraAgent as AgUiAgent } from '@ag-ui/mastra';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

// Run Mastra agent for agentId and stream its AG-UI events.
// Registered for POST /ag-ui/:agentId in ../index.ts.
export async function simpleAgUiRouteHandler(
  context: ContextWithMastra,
): Promise<Response> {
  const mastra = context.get('mastra');
  const requestContext = context.get('requestContext');
  const agentId = context.req.param('agentId') ?? '';

  const body = await context.req.json();
  const input = body as RunAgentInput;

  const agUiAgent = new AgUiAgent({
    agentId,
    agent: mastra.getAgent(agentId),
    resourceId: input.threadId,
    requestContext,
    threadId: input.threadId,
    initialMessages: input.messages,
  });

  return streamSSE(
    // Mastra bundles its own copy of Hono's types, so its Context doesn't fit.
    context as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await agUiAgent.runAgent(input, {
        onEvent: ({ event }) => sse.writeSSE({ data: JSON.stringify(event) }),
      });
    },
  );
}
