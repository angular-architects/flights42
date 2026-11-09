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

import { expressToDashboardSpec } from '../a2ui/interim-macros/express-to-dashboard-spec.js';
import {
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
import {
  compileDashboard,
  type CompiledDashboard,
  type DataStep,
} from '../dashboard-dsl/compile-dashboard.js';
import type { DashboardSpec } from '../dashboard-dsl/dashboard-spec.js';
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
): Promise<DashboardSpec | null> {
  try {
    return (await readDashboardCache(hash))?.spec ?? null;
  } catch (err) {
    console.error(`Failed to read dashboard cache (hash=${hash}):`, err);
    return null;
  }
}

export async function tryWriteDashboardCache(
  hash: string,
  spec: DashboardSpec,
): Promise<void> {
  try {
    await writeDashboardCache(hash, spec);
  } catch (err) {
    console.error(`Failed to write dashboard cache (hash=${hash}):`, err);
  }
}

export interface RenderDashboardInterceptor extends CreateAgUiEventStreamOptions {
  spec(): DashboardSpec | undefined;
}

export function interceptRenderDashboard(
  agUiAgent: AgUiAgent,
  trace: DashboardTrace,
): RenderDashboardInterceptor {
  let renderToolCallId: string | undefined;
  let argsBuffer = '';
  let capturedSpec: DashboardSpec | undefined;

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
        const { events, spec } = await handleRenderToolCallEnd(argsBuffer);
        trace.compiled();
        if (spec) {
          capturedSpec = spec;
        }
        if (events.some((event) => event.type === EventType.RUN_ERROR)) {
          agUiAgent.abortRun();
        }
        return events;
      }
    },
    spec: () => capturedSpec,
  };
}

export async function streamCachedDashboard(
  sse: SseWriter,
  input: RunAgentInput,
  spec: DashboardSpec,
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
  // panel still shows the dashboard spec the cache replayed.
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_START,
    parentMessageId: renderParentMessageId,
    toolCallId: renderToolCallId,
    toolCallName: RENDER_DASHBOARD_TOOL_NAME,
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: renderToolCallId,
    delta: JSON.stringify(spec),
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_END,
    toolCallId: renderToolCallId,
  } as BaseEvent);

  let compiled: CompiledDashboard;
  try {
    compiled = await compileDashboard(spec);
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

  for (const event of emitCompiledDashboardEvents(compiled)) {
    await emitFrame(sse, event);
  }

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

/**
 * Build the synthetic event sequence for a freshly compiled dashboard:
 * one `TOOL_CALL_*` group per compiler `DataStep` followed by the
 * `a2ui-surface` `ACTIVITY_SNAPSHOT` carrying the full A2UI operation
 * list. The caller is responsible for emitting any surrounding
 * lifecycle events (`RUN_STARTED`, the `renderDashboard`
 * `TOOL_CALL_*`, the matching `TOOL_CALL_RESULT`, `RUN_FINISHED`).
 */
function emitCompiledDashboardEvents(compiled: CompiledDashboard): BaseEvent[] {
  const events = buildDataStepEvents(compiled.dataSteps);
  events.push({
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: compiled.surfaceId,
    activityType: 'a2ui-surface',
    content: {
      [A2UI_OPERATIONS_KEY]: [...compiled.structural, ...compiled.dataModel],
    },
  } as unknown as BaseEvent);
  return events;
}

function buildDataStepEvents(steps: readonly DataStep[]): BaseEvent[] {
  const events: BaseEvent[] = [];
  for (const step of steps) {
    const toolCallId = `data-step-${randomUUID()}`;
    const parentMessageId = randomUUID();
    events.push({
      type: EventType.TOOL_CALL_START,
      parentMessageId,
      toolCallId,
      toolCallName: step.name,
    } as BaseEvent);
    events.push({
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: JSON.stringify(step.args ?? {}),
    } as BaseEvent);
    events.push({
      type: EventType.TOOL_CALL_END,
      toolCallId,
    } as BaseEvent);
    events.push({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      content: JSON.stringify(step.result ?? { ok: true }),
      messageId: randomUUID(),
      role: 'tool',
    } as unknown as BaseEvent);
  }
  return events;
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

function parseAccumulatedSpec(raw: string): DashboardSpec | null {
  if (!raw) {
    return null;
  }
  try {
    return expressToDashboardSpec(
      renderDashboardInputSchema.parse(JSON.parse(raw)).express,
    );
  } catch (err) {
    console.error('Invalid dashboard program:', err);
    return null;
  }
}

interface RenderToolCallEndResult {
  events: readonly BaseEvent[];
  spec: DashboardSpec | null;
}

async function handleRenderToolCallEnd(
  argsBuffer: string,
): Promise<RenderToolCallEndResult> {
  const spec = parseAccumulatedSpec(argsBuffer);
  if (!spec) {
    return {
      events: [
        makeRunError(
          `renderDashboard received invalid spec: ${truncate(argsBuffer)}`,
          'invalid_dashboard_spec',
        ),
      ],
      spec: null,
    };
  }
  try {
    const compiled = await compileDashboard(spec);
    return { events: emitCompiledDashboardEvents(compiled), spec };
  } catch (err) {
    return {
      events: [
        makeRunError(
          err instanceof Error ? err.message : String(err),
          'run_error',
        ),
      ],
      spec: null,
    };
  }
}

function makeRunError(message: string, code: string): BaseEvent {
  return { type: 'RUN_ERROR', message, code } as unknown as BaseEvent;
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
