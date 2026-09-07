import type {
  AbstractAgent,
  BaseEvent,
  Middleware,
  RunAgentInput,
} from '@ag-ui/client';
import { transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';
import type { Observable } from 'rxjs';

export interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

export interface CreateAgUiEventStreamOptions {
  onEvent?: (
    event: BaseEvent,
  ) => Promise<readonly BaseEvent[] | void> | readonly BaseEvent[] | void;
  middlewares?: readonly Middleware[];
}

export type ParseRunAgentInputResult =
  { ok: true; input: RunAgentInput } | { ok: false; response: Response };

type RunnableAgent = Pick<AbstractAgent, 'run' | 'messages' | 'state'>;

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

export function composeMiddlewares(
  agent: AbstractAgent,
  middlewares: readonly Middleware[],
): RunnableAgent {
  return middlewares.reduceRight<RunnableAgent>(
    (next, middleware) => ({
      run: (input: RunAgentInput): Observable<BaseEvent> =>
        middleware.run(input, next as AbstractAgent),
      get messages() {
        return next.messages;
      },
      get state() {
        return next.state;
      },
    }),
    agent,
  );
}

export async function streamAgentEvents(
  sse: SseWriter,
  agent: AbstractAgent,
  input: RunAgentInput,
  options: CreateAgUiEventStreamOptions = {},
): Promise<void> {
  await new Promise<void>((resolve) => {
    let writeQueue: Promise<void> = Promise.resolve();

    const source$ = composeMiddlewares(agent, options.middlewares ?? []).run(
      input,
    );
    const events$ = source$.pipe(transformChunks(false));
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
