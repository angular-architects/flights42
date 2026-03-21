import type { RunAgentInput } from '@ag-ui/client';
import { getLocalAgent } from '@ag-ui/mastra';
import type { ContextWithMastra } from '@mastra/core/server';

import { agUiSseHeaders, createAgUiEventStream } from './ag-ui-stream.js';

export async function agUiRouteHandler(c: ContextWithMastra) {
  const agentId = c.req.param('agentId');

  if (!agentId) {
    return c.json(
      {
        error: 'Missing route parameter: agentId',
        code: 'MISSING_AGENT_ID',
      },
      400,
    );
  }

  let input: RunAgentInput;
  try {
    input = (await c.req.json()) as RunAgentInput;
  } catch {
    return c.json(
      {
        error: 'Invalid JSON request body',
        code: 'INVALID_JSON',
      },
      400,
    );
  }

  const mastra = c.get('mastra');
  const requestContext = c.get('requestContext');
  const forwardedProps = input.forwardedProps as
    | { model?: string; modelHint?: string }
    | undefined;
  const modelHint = forwardedProps?.modelHint ?? forwardedProps?.model;

  if (modelHint) {
    requestContext.set('modelHint', modelHint);
  }

  const agent = getLocalAgent({
    mastra,
    agentId,
    resourceId: agentId,
    requestContext,
  });

  const stream = createAgUiEventStream(agent, input);
  return new Response(stream, { headers: { ...agUiSseHeaders } });
}
