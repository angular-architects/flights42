import type { RunAgentInput } from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';
import {
  getExtendedLocalAgent,
  observableToSseStream,
  SSE_HEADERS,
} from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';

import { travelPlanStatePreamble } from '../tools/plan/index.js';

const STATE_PREAMBLES: Record<string, (state: unknown) => string | undefined> =
  {
    travelRefinementAgent: travelPlanStatePreamble,
  };

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
    resourceId: input.threadId,
    requestContext,
    statePreamble: STATE_PREAMBLES[agentId ?? ''],
  });

  agent.setAbortSignal(c.req.raw.signal);

  const events$ = agent.run(input).pipe(transformChunks(false));
  const stream = observableToSseStream(events$);

  return new Response(stream, { headers: { ...SSE_HEADERS } });
}
