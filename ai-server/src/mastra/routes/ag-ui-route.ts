import type { AbstractAgent, BaseEvent, RunAgentInput } from '@ag-ui/client';
import { EventType, randomUUID, transformChunks } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { getExtendedLocalAgent } from '../../../../libs/ag-ui-server/index.js';
import {
  computeDashboardRequestHash,
  dashboardCacheExists,
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';

const DASHBOARD_AGENT_ID = 'dashboardAgent';

interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

interface CreateAgUiEventStreamOptions {
  onA2uiSurface?: (operations: unknown[]) => void;
}

async function streamAgentEvents(
  sse: SseWriter,
  agent: AbstractAgent,
  input: RunAgentInput,
  options: CreateAgUiEventStreamOptions,
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
        tryCaptureA2uiSurface(event, options.onA2uiSurface);
        enqueueEvent(event);
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

async function streamCachedDashboard(
  sse: SseWriter,
  threadId: string,
  runId: string,
  hash: string,
): Promise<void> {
  // RUN_STARTED is sent immediately so the SSE response starts streaming
  // before we touch the file system. The subsequent `await` on the cache
  // read is a real I/O yield, which keeps the response progressively
  // chunked instead of being flushed in one shot.
  await sse.writeSSE({
    data: JSON.stringify({ type: EventType.RUN_STARTED, threadId, runId }),
  });

  let cachedOperations: unknown[] | null;
  try {
    cachedOperations = await readDashboardCache(hash);
  } catch (err) {
    await sse.writeSSE({
      data: JSON.stringify({
        type: EventType.RUN_ERROR,
        message: err instanceof Error ? err.message : String(err),
        code: 'cache_read_error',
      }),
    });
    return;
  }

  if (!cachedOperations) {
    await sse.writeSSE({
      data: JSON.stringify({
        type: EventType.RUN_ERROR,
        message: `Dashboard cache miss after hit-check for hash=${hash}`,
        code: 'cache_inconsistent',
      }),
    });
    return;
  }

  await sse.writeSSE({
    data: JSON.stringify({
      type: EventType.ACTIVITY_SNAPSHOT,
      messageId: randomUUID(),
      activityType: 'a2ui-surface',
      content: { operations: cachedOperations },
    }),
  });
  await sse.writeSSE({
    data: JSON.stringify({ type: EventType.RUN_FINISHED, threadId, runId }),
  });
}

function tryCaptureA2uiSurface(
  event: BaseEvent,
  onA2uiSurface: ((operations: unknown[]) => void) | undefined,
): void {
  if (!onA2uiSurface) {
    return;
  }

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
    return;
  }

  onA2uiSurface(candidate.content.operations);
}

export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const agentId = c.req.param('agentId');
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  let input: RunAgentInput;
  try {
    input = (await c.req.json()) as RunAgentInput;
  } catch {
    return c.json(
      { error: 'invalid_request', message: 'Invalid JSON body' },
      400,
    );
  }

  if (!input?.threadId || !input?.runId || !Array.isArray(input.messages)) {
    return c.json(
      {
        error: 'invalid_request',
        message: 'Missing threadId, runId, or messages',
      },
      400,
    );
  }

  const cacheKey =
    agentId === DASHBOARD_AGENT_ID
      ? computeDashboardRequestHash(input.messages)
      : null;

  if (cacheKey && (await tryDashboardCacheExists(cacheKey))) {
    console.info(
      `[dashboard-cache] hit for hash=${cacheKey} (run=${input.runId})`,
    );
    return streamSSE(c, async (sse) => {
      await streamCachedDashboard(sse, input.threadId, input.runId, cacheKey);
    });
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: agentId ?? '',
    resourceId: agentId ?? '',
    requestContext,
  });

  return streamSSE(c, async (sse) => {
    await streamAgentEvents(sse, agent, input, {
      onA2uiSurface: cacheKey
        ? (operations) => {
            void writeDashboardCache(cacheKey, operations).then(
              () => {
                console.info(
                  `[dashboard-cache] stored hash=${cacheKey} (run=${input.runId})`,
                );
              },
              (err: unknown) => {
                console.warn(
                  `[dashboard-cache] failed to write hash=${cacheKey}:`,
                  err,
                );
              },
            );
          }
        : undefined,
    });
  });
}

async function tryDashboardCacheExists(hash: string): Promise<boolean> {
  try {
    return await dashboardCacheExists(hash);
  } catch (err) {
    console.warn(`[dashboard-cache] failed to check hash=${hash}:`, err);
    return false;
  }
}
