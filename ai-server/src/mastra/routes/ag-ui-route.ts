import type { AbstractAgent, BaseEvent, RunAgentInput } from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';

import { getExtendedLocalAgent } from '../../../../libs/ag-ui-server/index.js';

const ENCODER = new TextEncoder();

const AG_UI_SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

function createAgUiEventStream(
  agent: AbstractAgent,
  input: RunAgentInput,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(ENCODER.encode(':\n\n'));

      const events$ = agent.run(input).pipe(transformChunks(false));

      events$.subscribe({
        next(event: BaseEvent) {
          controller.enqueue(
            ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        },
        error(err: unknown) {
          controller.enqueue(
            ENCODER.encode(
              `data: ${JSON.stringify({
                type: 'RUN_ERROR',
                message: err instanceof Error ? err.message : String(err),
                code: 'run_error',
              })}\n\n`,
            ),
          );
          controller.close();
        },
        complete() {
          controller.close();
        },
      });
    },
  });
}

export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const agentId = c.req.param('agentId');
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

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

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: agentId ?? '',
    resourceId: agentId ?? '',
    requestContext,
  });

  const stream = createAgUiEventStream(agent, input);
  return new Response(stream, { headers: { ...AG_UI_SSE_HEADERS } });
}
