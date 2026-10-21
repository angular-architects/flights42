import { A2UI_OPERATIONS_KEY } from '@ag-ui/a2ui-middleware';
import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  Middleware,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import {
  concat,
  concatAll,
  concatMap,
  defer,
  map,
  type Observable,
  of,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs';

import {
  computeDashboardRequestHash,
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
import {
  compileDashboard,
  type CompiledDashboard,
  type DataStep,
} from '../dashboard-dsl/compile-dashboard.js';
import {
  type DashboardSpec,
  dashboardSpecSchema,
} from '../dashboard-dsl/dashboard-spec.js';
import { RENDER_DASHBOARD_TOOL_NAME } from '../tools/render-dashboard.js';

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

export class RenderDashboardMiddleware extends Middleware {
  run(input: RunAgentInput, next: AbstractAgent): Observable<BaseEvent> {
    const cacheKey = isCacheable(input)
      ? computeDashboardRequestHash(input.messages)
      : null;

    return defer(() => tryReadDashboardCache(cacheKey)).pipe(
      switchMap((cachedSpec) => {
        if (cachedSpec) {
          return replayCachedDashboard(input, cachedSpec);
        }
        return compileRenderedDashboard(this.runNext(input, next), cacheKey);
      }),
    );
  }
}

function isCacheable(input: RunAgentInput): boolean {
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

async function tryReadDashboardCache(
  hash: string | null,
): Promise<DashboardSpec | null> {
  if (!hash) {
    return null;
  }
  try {
    return (await readDashboardCache(hash))?.spec ?? null;
  } catch (err) {
    console.error(`Failed to read dashboard cache (hash=${hash}):`, err);
    return null;
  }
}

async function tryWriteDashboardCache(
  hash: string,
  spec: DashboardSpec,
): Promise<void> {
  try {
    await writeDashboardCache(hash, spec);
  } catch (err) {
    console.error(`Failed to write dashboard cache (hash=${hash}):`, err);
  }
}

function compileRenderedDashboard(
  events: Observable<BaseEvent>,
  cacheKey: string | null,
): Observable<BaseEvent> {
  let renderToolCallId: string | undefined;
  let argsBuffer = '';

  return events.pipe(
    concatMap(async (event): Promise<BaseEvent[]> => {
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
        return [event];
      }

      if (
        e.type === EventType.TOOL_CALL_ARGS &&
        e.toolCallId === renderToolCallId &&
        typeof e.delta === 'string'
      ) {
        argsBuffer += e.delta;
        return [event];
      }

      if (
        e.type === EventType.TOOL_CALL_END &&
        e.toolCallId === renderToolCallId
      ) {
        const { events, spec } = await handleRenderToolCallEnd(argsBuffer);
        if (spec && cacheKey) {
          await tryWriteDashboardCache(cacheKey, spec);
        }
        return [event, ...events];
      }

      return [event];
    }),
    concatAll(),
    takeWhile((event) => event.type !== EventType.RUN_ERROR, true),
  );
}

function replayCachedDashboard(
  input: RunAgentInput,
  spec: DashboardSpec,
): Observable<BaseEvent> {
  const renderToolCallId = randomUUID();
  const renderParentMessageId = randomUUID();

  return concat(
    of(
      {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent,
      // Mirror what the LLM would emit on a cache miss so the "tool calls"
      // panel still shows the dashboard spec the cache replayed.
      {
        type: EventType.TOOL_CALL_START,
        parentMessageId: renderParentMessageId,
        toolCallId: renderToolCallId,
        toolCallName: RENDER_DASHBOARD_TOOL_NAME,
      } as BaseEvent,
      {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: renderToolCallId,
        delta: JSON.stringify(spec),
      } as BaseEvent,
      {
        type: EventType.TOOL_CALL_END,
        toolCallId: renderToolCallId,
      } as BaseEvent,
    ),
    defer(() => finishCachedDashboard(input, spec, renderToolCallId)).pipe(
      concatAll(),
    ),
  ).pipe(concatMap(delayFrame));
}

async function finishCachedDashboard(
  input: RunAgentInput,
  spec: DashboardSpec,
  renderToolCallId: string,
): Promise<BaseEvent[]> {
  let compiled: CompiledDashboard;
  try {
    compiled = await compileDashboard(spec);
  } catch (err) {
    return [
      makeRunError(
        err instanceof Error ? err.message : String(err),
        'run_error',
      ),
    ];
  }

  return [
    ...emitCompiledDashboardEvents(compiled),
    {
      type: EventType.TOOL_CALL_RESULT,
      toolCallId: renderToolCallId,
      content: JSON.stringify({ ok: true, cached: true }),
      messageId: randomUUID(),
      role: 'tool',
    } as unknown as BaseEvent,
    {
      type: EventType.RUN_FINISHED,
      threadId: input.threadId,
      runId: input.runId,
    } as BaseEvent,
  ];
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

function delayFrame(event: BaseEvent): Observable<BaseEvent> {
  if (CACHED_FRAME_DELAY_MS === null) {
    return of(event);
  }
  return timer(CACHED_FRAME_DELAY_MS).pipe(map(() => event));
}

function parseAccumulatedSpec(raw: string): DashboardSpec | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = dashboardSpecSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Invalid dashboard spec:', result.error.issues);
    return null;
  }
  return result.data;
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
