import { A2UI_OPERATIONS_KEY, A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import {
  type BaseEvent,
  EventType,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import { MastraAgent as AgUiAgent } from '@ag-ui/mastra';
import type { Mastra } from '@mastra/core/mastra';
import type { RequestContext } from '@mastra/core/request-context';

import {
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
import {
  compileDashboard,
  type CompiledDashboard,
} from '../dashboard-dsl/compile-dashboard.js';
import {
  RENDER_DASHBOARD_TOOL_NAME,
  renderDashboardInputSchema,
} from '../tools/render-dashboard.js';
import type { CreateAgUiEventStreamOptions } from './ag-ui-stream.js';
import type { DashboardTrace } from './dashboard-trace.js';
import { type SseWriter, withoutMemoryArgs } from './route-utils.js';

const DASHBOARD_AGENT_ID = 'dashboardAgent';

const CACHED_FRAME_DELAY_MS = resolveCachedFrameDelayMs();

function resolveCachedFrameDelayMs(): number | null {
  if (process.env['NODE_ENV'] === 'production') {
    return null;
  }
  const raw = process.env['AG_UI_STREAM_FRAME_DELAY_MS'];
  if (raw === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function createDashboardAgent(
  mastra: Mastra,
  requestContext: RequestContext,
  input: RunAgentInput,
): AgUiAgent {
  return new AgUiAgent({
    agentId: DASHBOARD_AGENT_ID,
    agent: withoutMemoryArgs(mastra.getAgent(DASHBOARD_AGENT_ID)),
    resourceId: DASHBOARD_AGENT_ID,
    requestContext,
    threadId: input.threadId,
    initialMessages: input.messages,
    initialState: input.state,
  }).use(new A2UIMiddleware({ a2uiToolNames: [] }));
}

export function isCacheable(input: RunAgentInput): boolean {
  return !isPreventCachingRequested(input) && !isA2uiActionRequest(input);
}

function isPreventCachingRequested(input: RunAgentInput): boolean {
  const props = input.forwardedProps;
  if (!props || typeof props !== 'object') {
    return false;
  }
  const value = (props as { preventCaching?: unknown }).preventCaching;
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.toLowerCase().trim();
    return normalised === '1' || normalised === 'true' || normalised === 'yes';
  }
  return false;
}

function isA2uiActionRequest(input: RunAgentInput): boolean {
  const props = input.forwardedProps;
  if (!props || typeof props !== 'object') {
    return false;
  }
  return Boolean((props as { a2uiAction?: unknown }).a2uiAction);
}

export async function tryReadDashboardCache(
  hash: string,
): Promise<string | null> {
  try {
    return (await readDashboardCache(hash))?.express ?? null;
  } catch (err) {
    console.error(`Failed to read dashboard cache (hash=${hash}):`, err);
    return null;
  }
}

export async function tryWriteDashboardCache(
  hash: string,
  express: string,
): Promise<void> {
  try {
    await writeDashboardCache(hash, express);
  } catch (err) {
    console.error(`Failed to write dashboard cache (hash=${hash}):`, err);
  }
}

export interface RenderDashboardInterceptor extends CreateAgUiEventStreamOptions {
  express(): string | undefined;
}

export function interceptRenderDashboard(
  agUiAgent: AgUiAgent,
  trace: DashboardTrace,
): RenderDashboardInterceptor {
  let renderToolCallId: string | undefined;
  let argsBuffer = '';
  let capturedExpress: string | undefined;

  return {
    onEvent: async (event): Promise<readonly BaseEvent[] | void> => {
      const e = event as BaseEvent & {
        toolCallId?: string;
        toolCallName?: string;
        delta?: string;
      };

      if (
        e.type === EventType.TOOL_CALL_START &&
        e.toolCallName === RENDER_DASHBOARD_TOOL_NAME &&
        typeof e.toolCallId === 'string'
      ) {
        renderToolCallId = e.toolCallId;
        argsBuffer = '';
        return;
      }

      if (
        e.type === EventType.TOOL_CALL_ARGS &&
        e.toolCallId === renderToolCallId &&
        typeof e.delta === 'string'
      ) {
        argsBuffer += e.delta;
        return;
      }

      if (
        e.type === EventType.TOOL_CALL_END &&
        e.toolCallId === renderToolCallId
      ) {
        trace.specReady();
        const result = await handleRenderToolCallEnd(argsBuffer);
        trace.compiled();
        if (result.express) {
          capturedExpress = result.express;
        }
        if (result.events.some((event) => event.type === EventType.RUN_ERROR)) {
          agUiAgent.abortRun();
        }
        return result.events;
      }
    },
    express: () => capturedExpress,
  };
}

export async function streamCachedDashboard(
  sse: SseWriter,
  input: RunAgentInput,
  express: string,
  trace: DashboardTrace,
): Promise<void> {
  trace.specReady();
  await emitFrame(sse, {
    type: EventType.RUN_STARTED,
    threadId: input.threadId,
    runId: input.runId,
  } as BaseEvent);

  const renderToolCallId = randomUUID();
  const renderParentMessageId = randomUUID();

  // Mirror what the LLM would emit on a cache miss so the "tool calls"
  // panel still shows the dashboard program the cache replayed.
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_START,
    parentMessageId: renderParentMessageId,
    toolCallId: renderToolCallId,
    toolCallName: RENDER_DASHBOARD_TOOL_NAME,
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: renderToolCallId,
    delta: JSON.stringify({ express }),
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_END,
    toolCallId: renderToolCallId,
  } as BaseEvent);

  let compiled: CompiledDashboard;
  try {
    compiled = await compileDashboard(express);
  } catch (err) {
    await emitFrame(
      sse,
      makeRunError(
        err instanceof Error ? err.message : String(err),
        'run_error',
      ),
    );
    return;
  }
  trace.compiled();

  const snapshot = buildSurfaceSnapshot(compiled);
  await emitFrame(sse, snapshot);

  await emitFrame(sse, {
    type: EventType.TOOL_CALL_RESULT,
    toolCallId: renderToolCallId,
    content: JSON.stringify({ ok: true, cached: true }),
    messageId: randomUUID(),
    role: 'tool',
  } as unknown as BaseEvent);

  await emitFrame(sse, {
    type: EventType.RUN_FINISHED,
    threadId: input.threadId,
    runId: input.runId,
  } as BaseEvent);
}

function buildSurfaceSnapshot(compiled: CompiledDashboard): BaseEvent {
  return {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: compiled.surfaceId,
    activityType: 'a2ui-surface',
    content: {
      [A2UI_OPERATIONS_KEY]: compiled.messages,
    },
  } as unknown as BaseEvent;
}

function emit(sse: SseWriter, event: BaseEvent): Promise<void> {
  return sse.writeSSE({ data: JSON.stringify(event) });
}

// Like `emit`, but yields to the macrotask queue afterwards (dev only)
// so each cached-replay frame is flushed as its own network chunk and
// stays visible in the browser DevTools Network tab. See
// `CACHED_FRAME_DELAY_MS` for why this is needed and how to disable it.
async function emitFrame(sse: SseWriter, event: BaseEvent): Promise<void> {
  await emit(sse, event);
  if (CACHED_FRAME_DELAY_MS !== null) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, CACHED_FRAME_DELAY_MS),
    );
  }
}

function parseAccumulatedExpress(raw: string): string | null {
  if (!raw) {
    return null;
  }
  try {
    const args = JSON.parse(raw);
    return renderDashboardInputSchema.parse(args).express;
  } catch (err) {
    console.error('Invalid renderDashboard args:', err);
    return null;
  }
}

interface RenderToolCallEndResult {
  events: readonly BaseEvent[];
  express: string | null;
}

async function handleRenderToolCallEnd(
  argsBuffer: string,
): Promise<RenderToolCallEndResult> {
  const express = parseAccumulatedExpress(argsBuffer);
  if (!express) {
    return {
      events: [
        makeRunError(
          `renderDashboard received invalid args: ${truncate(argsBuffer)}`,
          'invalid_dashboard_spec',
        ),
      ],
      express: null,
    };
  }
  try {
    const compiled = await compileDashboard(express);
    const snapshot = buildSurfaceSnapshot(compiled);
    return { events: [snapshot], express };
  } catch (err) {
    return {
      events: [
        makeRunError(
          err instanceof Error ? err.message : String(err),
          'run_error',
        ),
      ],
      express: null,
    };
  }
}

function makeRunError(message: string, code: string): BaseEvent {
  return { type: 'RUN_ERROR', message, code } as unknown as BaseEvent;
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
