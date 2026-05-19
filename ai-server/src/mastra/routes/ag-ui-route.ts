import type { RunAgentInput } from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';

import {
  getExtendedLocalAgent,
  observableToSseStream,
  SSE_HEADERS,
} from '../../../../libs/ag-ui-server/index.js';

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

  const mode = (input.forwardedProps as { agentMode?: unknown } | undefined)
    ?.agentMode;
  const effectiveAgentId =
    mode === 'plan'
      ? 'planningAgent'
      : mode === 'execution'
        ? 'ticketingAgent'
        : (agentId ?? '');

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: effectiveAgentId,
    resourceId: input.threadId,
    requestContext,
  });

  agent.setAbortSignal(c.req.raw.signal);

  const events$ = agent.run(input).pipe(transformChunks(false));
  const stream = observableToSseStream(events$);

  return new Response(stream, { headers: { ...SSE_HEADERS } });
}
