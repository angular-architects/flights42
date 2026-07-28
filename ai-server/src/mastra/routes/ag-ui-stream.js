import { transformChunks } from '@ag-ui/client';
export async function parseRunAgentInput(c) {
  let input;
  try {
    input = await c.req.json();
  } catch {
    return {
      ok: false,
      response: c.json(
        { error: 'invalid_request', message: 'Invalid JSON body' },
        400,
      ),
    };
  }
  if (!input?.threadId || !input?.runId || !Array.isArray(input.messages)) {
    return {
      ok: false,
      response: c.json(
        {
          error: 'invalid_request',
          message: 'Missing threadId, runId, or messages',
        },
        400,
      ),
    };
  }
  return { ok: true, input };
}
export async function streamAgentEvents(sse, agent, input, options = {}) {
  await new Promise((resolve) => {
    // The RxJS subscriber runs synchronously per event. We funnel each
    // write through `writeQueue` so SSE frames are emitted in order
    // (writeSSE is async; multiple unawaited calls could otherwise
    // interleave at their internal await points). The `onEvent` hook
    // is queued behind the originating event's write so any follow-up
    // events are guaranteed to appear right after it.
    let writeQueue = Promise.resolve();
    const source$ = options.middleware
      ? options.middleware.run(input, agent)
      : agent.run(input);
    const events$ = source$.pipe(transformChunks(false));
    events$.subscribe({
      next(event) {
        writeQueue = writeQueue
          .then(() => sse.writeSSE({ data: JSON.stringify(event) }))
          .catch(() => undefined);
        if (options.onEvent) {
          writeQueue = writeQueue
            .then(async () => {
              const extras = await options.onEvent(event);
              if (!extras) {
                return;
              }
              for (const extra of extras) {
                await sse.writeSSE({ data: JSON.stringify(extra) });
              }
            })
            .catch(() => undefined);
        }
      },
      error(err) {
        writeQueue = writeQueue
          .then(() =>
            sse.writeSSE({
              data: JSON.stringify({
                type: 'RUN_ERROR',
                message: err instanceof Error ? err.message : String(err),
                code: 'run_error',
              }),
            }),
          )
          .catch(() => undefined);
        writeQueue.finally(() => resolve());
      },
      complete() {
        writeQueue.finally(() => resolve());
      },
    });
  });
}
