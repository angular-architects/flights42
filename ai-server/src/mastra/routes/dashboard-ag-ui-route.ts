import {
  type BaseEvent,
  EventType,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { getExtendedLocalAgent } from '../../../../libs/ag-ui-server/index.js';
import {
  computeDashboardRequestHash,
  type DashboardCacheEntry,
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
import {
  parseRunAgentInput,
  type SseWriter,
  streamAgentEvents,
} from './ag-ui-stream.js';

const DASHBOARD_AGENT_ID = 'dashboardAgent';

export async function dashboardAgUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { input } = parsed;
  const preventCaching = isPreventCachingRequested(input);
  const cacheKey = computeDashboardRequestHash(input.messages);

  if (!preventCaching) {
    const cached = await tryServeFromCache(c, cacheKey, input);
    if (cached) {
      return cached;
    }
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: DASHBOARD_AGENT_ID,
    resourceId: DASHBOARD_AGENT_ID,
    requestContext,
  });

  return streamSSE(c, async (sse) => {
    let renderToolCallId: string | undefined;
    let argsBuffer = '';
    let capturedSpec: DashboardSpec | undefined;

    await streamAgentEvents(sse, agent, input, {
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
          const { events, spec } = await handleRenderToolCallEnd(argsBuffer);
          if (spec) {
            capturedSpec = spec;
          }
          return events;
        }
      },
    });

    if (capturedSpec && !preventCaching) {
      try {
        await writeDashboardCache(cacheKey, capturedSpec);
      } catch (err) {
        console.error(
          `Failed to write dashboard cache (hash=${cacheKey}):`,
          err,
        );
      }
    }
  });
}

async function streamCachedDashboard(
  sse: SseWriter,
  input: RunAgentInput,
  spec: DashboardSpec,
): Promise<void> {
  await emit(sse, {
    type: EventType.RUN_STARTED,
    threadId: input.threadId,
    runId: input.runId,
  } as BaseEvent);

  const renderToolCallId = randomUUID();
  const renderParentMessageId = randomUUID();

  // Mirror what the LLM would emit on a cache miss so the "tool calls"
  // panel still shows the dashboard spec the cache replayed.
  await emit(sse, {
    type: EventType.TOOL_CALL_START,
    parentMessageId: renderParentMessageId,
    toolCallId: renderToolCallId,
    toolCallName: RENDER_DASHBOARD_TOOL_NAME,
  } as BaseEvent);
  await emit(sse, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: renderToolCallId,
    delta: JSON.stringify(spec),
  } as BaseEvent);
  await emit(sse, {
    type: EventType.TOOL_CALL_END,
    toolCallId: renderToolCallId,
  } as BaseEvent);

  let compiled: CompiledDashboard;
  try {
    compiled = await compileDashboard(spec);
  } catch (err) {
    await emit(
      sse,
      makeRunError(
        err instanceof Error ? err.message : String(err),
        'run_error',
      ),
    );
    return;
  }

  for (const event of emitCompiledDashboardEvents(compiled)) {
    await emit(sse, event);
  }

  await emit(sse, {
    type: EventType.TOOL_CALL_RESULT,
    toolCallId: renderToolCallId,
    content: JSON.stringify({ ok: true, cached: true }),
    messageId: randomUUID(),
    role: 'tool',
  } as unknown as BaseEvent);

  await emit(sse, {
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
      operations: [...compiled.structural, ...compiled.dataModel],
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
  return result.success ? result.data : null;
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

async function tryReadDashboardCache(
  hash: string,
): Promise<DashboardCacheEntry | null> {
  try {
    return await readDashboardCache(hash);
  } catch (err) {
    console.error(`Failed to read dashboard cache (hash=${hash}):`, err);
    return null;
  }
}

async function tryServeFromCache(
  c: ContextWithMastra,
  cacheKey: string,
  input: RunAgentInput,
): Promise<Response | null> {
  const entry = await tryReadDashboardCache(cacheKey);
  if (!entry) {
    return null;
  }
  return streamSSE(c, async (sse) => {
    await streamCachedDashboard(sse, input, entry.spec);
  });
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
