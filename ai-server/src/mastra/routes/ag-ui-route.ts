import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';
import {
  ensureThread,
  middlewaresFor,
  resolveResumeCommand,
  toAgUiAgent,
} from './route-utils.js';

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

  await ensureThread(mastraAgent, input.threadId);

  // Resume takes the adapter's normal path (proxied agent, `resume` stripped):
  // its own resume branch drops clientTools — ag-ui-protocol/ag-ui#2667.
  const resumeCommand = resolveResumeCommand(input);
  const agUiAgent = toAgUiAgent({
    agentId,
    mastraAgent,
    threadId: input.threadId,
    requestContext,
    resumeCommand,
  });
  const runInput = resumeCommand ? { ...input, resume: undefined } : input;

  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamAgentEvents(sse, agUiAgent, runInput, {
        middlewares: middlewaresFor(agentId),
      });
    },
  );
}
