import type { RunAgentInput } from '@ag-ui/core';
import { MastraAgent } from '@ag-ui/mastra';
import type { Agent } from '@mastra/core/agent';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

const ENCODER = new TextEncoder();

function serializeEvent(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function serializeError(err: unknown): string {
  return serializeEvent({
    type: 'RUN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    code: 'run_error',
  });
}

export function streamAgUi(
  agent: Agent,
  input: RunAgentInput,
): ReadableStream<Uint8Array> {
  const aguiAgent = new MastraAgent({ agent, resourceId: input.threadId });

  let subscription: { unsubscribe(): void } | undefined;
  let closed = false;

  const safeEnqueue = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    chunk: Uint8Array,
  ): void => {
    if (closed) {
      return;
    }
    try {
      controller.enqueue(chunk);
    } catch {
      closed = true;
      subscription?.unsubscribe();
    }
  };

  const safeClose = (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void => {
    if (closed) {
      return;
    }
    closed = true;
    try {
      controller.close();
    } catch {
      // Controller already closed by the runtime (e.g. client disconnect).
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      safeEnqueue(controller, ENCODER.encode(':\n\n'));

      subscription = aguiAgent.run(input).subscribe({
        next: (event) => {
          safeEnqueue(controller, ENCODER.encode(serializeEvent(event)));
        },
        error: (error) => {
          safeEnqueue(controller, ENCODER.encode(serializeError(error)));
          safeClose(controller);
        },
        complete: () => {
          safeClose(controller);
        },
      });
    },
    cancel() {
      closed = true;
      subscription?.unsubscribe();
    },
  });
}
