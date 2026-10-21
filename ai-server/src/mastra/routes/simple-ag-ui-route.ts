import {
  EventType,
  type RunAgentInput,
  type RunErrorEvent,
} from '@ag-ui/client';
import { MastraAgent as AgUiAgent } from '@ag-ui/mastra';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

const TICKETING_AGENT_ID = 'ticketingAgent';

export async function simpleAgUiRouteHandler(
  context: ContextWithMastra,
): Promise<Response> {
  const mastra = context.get('mastra');
  const requestContext = context.get('requestContext');

  const body = await context.req.json();
  const input = body as RunAgentInput;

  const agUiAgent = new AgUiAgent({
    agentId: TICKETING_AGENT_ID,
    agent: mastra.getAgent(TICKETING_AGENT_ID),
    resourceId: input.threadId,
    requestContext,
    threadId: input.threadId,
    initialMessages: input.messages,
  });

  return streamSSE(
    context as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      let runErrorSent = false;
      try {
        await agUiAgent.runAgent(input, {
          onEvent: async ({ event }) => {
            if (event.type === EventType.RUN_ERROR) {
              runErrorSent = true;
            }
            await sse.writeSSE({ data: JSON.stringify(event) });
          },
        });
      } catch (error) {
        if (runErrorSent) {
          return;
        }
        const runError: RunErrorEvent = {
          type: EventType.RUN_ERROR,
          message: error instanceof Error ? error.message : String(error),
        };
        await sse.writeSSE({ data: JSON.stringify(runError) });
      }
    },
  );
}
