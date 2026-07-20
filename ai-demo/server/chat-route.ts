import type { RunAgentInput } from '@ag-ui/core';
import { MastraAgent } from '@ag-ui/mastra';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';
import { concatMap, lastValueFrom } from 'rxjs';

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const input = (await c.req.json()) as RunAgentInput;
  const agent = c.get('mastra').getAgent('weatherAgent');
  const aguiAgent = new MastraAgent({ agent, resourceId: input.threadId });

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
