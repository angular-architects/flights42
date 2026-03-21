import type { AbstractAgent, RunAgentInput } from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';

const encoder = new TextEncoder();

export function createAgUiEventStream(
  agent: AbstractAgent,
  input: RunAgentInput,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(':\n\n'));

      const events$ = agent.run(input).pipe(transformChunks(false));

      events$.subscribe({
        next(event) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        },
        error(error: unknown) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'RUN_ERROR',
                message: error instanceof Error ? error.message : String(error),
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

export const agUiSseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;
