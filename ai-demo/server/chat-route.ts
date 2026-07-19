import type { RunAgentInput } from '@ag-ui/core';
import { MastraAgent } from '@ag-ui/mastra';
import type { ContextWithMastra } from '@mastra/core/server';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

const encoder = new TextEncoder();

function sseFrame(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function chatRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const input = (await c.req.json()) as RunAgentInput;

  const agent = c.get('mastra').getAgent('weatherAgent');
  const aguiAgent = new MastraAgent({ agent, resourceId: input.threadId });

  let subscription: { unsubscribe(): void } | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown): void => {
        try {
          controller.enqueue(sseFrame(event));
        } catch {
          subscription?.unsubscribe();
        }
      };
      const close = (): void => {
        try {
          controller.close();
        } catch {
          subscription?.unsubscribe();
        }
      };

      controller.enqueue(encoder.encode(':\n\n'));

      subscription = aguiAgent.run(input).subscribe({
        next: send,
        error: (err) => {
          send({
            type: 'RUN_ERROR',
            message: err instanceof Error ? err.message : String(err),
            code: 'run_error',
          });
          close();
        },
        complete: close,
      });
    },
    cancel() {
      subscription?.unsubscribe();
    },
  });

  return new Response(stream, { headers: { ...SSE_HEADERS } });
}
