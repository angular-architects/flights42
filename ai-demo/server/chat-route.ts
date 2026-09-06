import type { RunAgentInput } from '@ag-ui/core';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';
import { concatMap, lastValueFrom } from 'rxjs';

import { getExtendedLocalAgent } from '../../libs/ag-ui-server/index.js';

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const input = (await c.req.json()) as RunAgentInput;
  const aguiAgent = getExtendedLocalAgent({
    mastra: c.get('mastra'),
    agentId: 'weatherAgent',
    resourceId: input.threadId,
  });

  return streamSSE(c, async (sse) => {
    const send = (data: unknown): Promise<void> =>
      sse.writeSSE({ data: JSON.stringify(data) });

    try {
      await lastValueFrom(aguiAgent.run(input).pipe(concatMap(send)), {
        defaultValue: undefined,
      });
    } catch (err) {
      await send({
        type: 'RUN_ERROR',
        message: err instanceof Error ? err.message : String(err),
        code: 'run_error',
      });
    }
  });
}
