import type { AbstractAgent, BaseEvent, RunAgentInput } from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';

export interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

export interface CreateAgUiEventStreamOptions {
  /**
   * Fired for every event observed from the agent's run after it has
   * been enqueued for the SSE writer. May return additional events to
   * be appended to the stream in the order returned. The hook is
   * `await`-ed in the same sequential write queue as the originating
   * event, so any follow-up events are guaranteed to appear after the
   * triggering one and before subsequent agent events.
   *
   * Used by the dashboard route to react to the `renderDashboard`
   * tool-call lifecycle: it accumulates the DSL spec from
   * `TOOL_CALL_ARGS` deltas and, on `TOOL_CALL_END`, compiles the spec
   * and injects synthetic data-step + A2UI surface events without
   * round-tripping the A2UI through the LLM.
   */
  onEvent?: (
    event: BaseEvent,
  ) => Promise<readonly BaseEvent[] | void> | readonly BaseEvent[] | void;
}

export type ParseRunAgentInputResult =
  | { ok: true; input: RunAgentInput }
  | { ok: false; response: Response };

export async function parseRunAgentInput(
  c: ContextWithMastra,
): Promise<ParseRunAgentInputResult> {
  let input: RunAgentInput;
  try {
    input = (await c.req.json()) as RunAgentInput;
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

export async function streamAgentEvents(
  sse: SseWriter,
  agent: AbstractAgent,
  input: RunAgentInput,
  options: CreateAgUiEventStreamOptions = {},
): Promise<void> {
  await new Promise<void>((resolve) => {
    // The RxJS subscriber runs synchronously per event. We funnel each
    // write through `writeQueue` so SSE frames are emitted in order
    // (writeSSE is async; multiple unawaited calls could otherwise
    // interleave at their internal await points). The `onEvent` hook
    // is queued behind the originating event's write so any follow-up
    // events are guaranteed to appear right after it.
    let writeQueue: Promise<void> = Promise.resolve();

    const events$ = agent.run(input).pipe(transformChunks(false));
    events$.subscribe({
      next(event: BaseEvent) {
        writeQueue = writeQueue
          .then(() => sse.writeSSE({ data: JSON.stringify(event) }))
          .catch(() => undefined);
        if (options.onEvent) {
          writeQueue = writeQueue
            .then(async () => {
              const extras = await options.onEvent!(event);
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
      error(err: unknown) {
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
