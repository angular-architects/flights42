import type { AbstractAgent, BaseEvent, RunAgentInput } from '@ag-ui/client';
import { EventType, transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';

export interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

export interface CreateAgUiEventStreamOptions {
  onA2uiSurface?: (operations: unknown[]) => void;
  /**
   * Optional transform applied to every `a2ui-surface`
   * `ACTIVITY_SNAPSHOT` operations array before it is forwarded to the
   * SSE client. Used by the dashboard delta-cache path to merge cached
   * structural operations into the data agent's `updateDataModel`-only
   * snapshot, so the client renders the dashboard exactly once with the
   * full operation list.
   */
  transformA2uiOperations?: (operations: unknown[]) => unknown[];
  /**
   * Hook fired right before an `a2ui-surface` `ACTIVITY_SNAPSHOT` is
   * forwarded. Returned events are written to the SSE stream first, in
   * the order returned, then the snapshot itself. Used by the dashboard
   * route to surface the compiler's data fetches as synthetic AG-UI
   * tool-call events so the user retains the same "tool calls" insight
   * they had before the DSL refactor (when each fetch was an individual
   * LLM tool call).
   */
  injectBeforeA2uiSurface?: (
    operations: readonly unknown[],
  ) => readonly BaseEvent[];
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
    // interleave at their internal await points).
    let writeQueue: Promise<void> = Promise.resolve();
    const enqueueEvent = (event: unknown): void => {
      writeQueue = writeQueue
        .then(() => sse.writeSSE({ data: JSON.stringify(event) }))
        .catch(() => undefined);
    };

    const events$ = agent.run(input).pipe(transformChunks(false));
    events$.subscribe({
      next(event: BaseEvent) {
        const transformed = transformA2uiSurface(
          event,
          options.transformA2uiOperations,
        );
        const ops = readA2uiSurfaceOperations(transformed);
        if (ops && options.injectBeforeA2uiSurface) {
          for (const injected of options.injectBeforeA2uiSurface(ops)) {
            enqueueEvent(injected);
          }
        }
        tryCaptureA2uiSurface(transformed, options.onA2uiSurface);
        enqueueEvent(transformed);
      },
      error(err: unknown) {
        enqueueEvent({
          type: 'RUN_ERROR',
          message: err instanceof Error ? err.message : String(err),
          code: 'run_error',
        });
        writeQueue.finally(() => resolve());
      },
      complete() {
        writeQueue.finally(() => resolve());
      },
    });
  });
}

export function tryCaptureA2uiSurface(
  event: BaseEvent,
  onA2uiSurface: ((operations: unknown[]) => void) | undefined,
): void {
  if (!onA2uiSurface) {
    return;
  }

  const operations = readA2uiSurfaceOperations(event);
  if (!operations) {
    return;
  }

  onA2uiSurface(operations);
}

function transformA2uiSurface(
  event: BaseEvent,
  transform: ((operations: unknown[]) => unknown[]) | undefined,
): BaseEvent {
  if (!transform) {
    return event;
  }
  const operations = readA2uiSurfaceOperations(event);
  if (!operations) {
    return event;
  }

  const next = transform(operations);
  if (next === operations) {
    return event;
  }

  // Shallow-clone the event so we don't mutate the original observed by
  // any other listener; replace `content.operations` with the transformed
  // array.
  const candidate = event as BaseEvent & {
    content?: { operations?: unknown[] };
  };
  return {
    ...candidate,
    content: { ...(candidate.content ?? {}), operations: next },
  } as BaseEvent;
}

function readA2uiSurfaceOperations(event: BaseEvent): unknown[] | null {
  const candidate = event as {
    type?: string;
    activityType?: string;
    content?: { operations?: unknown };
  };

  if (
    candidate.type !== EventType.ACTIVITY_SNAPSHOT ||
    candidate.activityType !== 'a2ui-surface' ||
    !Array.isArray(candidate.content?.operations)
  ) {
    return null;
  }

  return candidate.content.operations;
}
