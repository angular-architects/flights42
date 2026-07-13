import { EventType, randomUUID } from '@ag-ui/client';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import { streamSSE } from 'hono/streaming';

import {
  computeDashboardRequestHash,
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
import { compileDashboard } from '../dashboard-dsl/compile-dashboard.js';
import { dashboardSpecSchema } from '../dashboard-dsl/dashboard-spec.js';
import { RENDER_DASHBOARD_TOOL_NAME } from '../tools/render-dashboard.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';
const DASHBOARD_AGENT_ID = 'dashboardAgent';
const CACHED_FRAME_DELAY_MS = resolveCachedFrameDelayMs();
function resolveCachedFrameDelayMs() {
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
export async function dashboardAgUiRouteHandler(c) {
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
  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(c, async (sse) => {
    let renderToolCallId;
    let argsBuffer = '';
    let capturedSpec;
    await streamAgentEvents(sse, agent, input, {
      onEvent: async (event) => {
        const e = event;
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
async function streamCachedDashboard(sse, input, spec) {
  await emitFrame(sse, {
    type: EventType.RUN_STARTED,
    threadId: input.threadId,
    runId: input.runId,
  });
  const renderToolCallId = randomUUID();
  const renderParentMessageId = randomUUID();
  // Mirror what the LLM would emit on a cache miss so the "tool calls"
  // panel still shows the dashboard spec the cache replayed.
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_START,
    parentMessageId: renderParentMessageId,
    toolCallId: renderToolCallId,
    toolCallName: RENDER_DASHBOARD_TOOL_NAME,
  });
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: renderToolCallId,
    delta: JSON.stringify(spec),
  });
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_END,
    toolCallId: renderToolCallId,
  });
  let compiled;
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
  for (const event of emitCompiledDashboardEvents(compiled)) {
    await emitFrame(sse, event);
  }
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_RESULT,
    toolCallId: renderToolCallId,
    content: JSON.stringify({ ok: true, cached: true }),
    messageId: randomUUID(),
    role: 'tool',
  });
  await emitFrame(sse, {
    type: EventType.RUN_FINISHED,
    threadId: input.threadId,
    runId: input.runId,
  });
}
/**
 * Build the synthetic event sequence for a freshly compiled dashboard:
 * one `TOOL_CALL_*` group per compiler `DataStep` followed by the
 * `a2ui-surface` `ACTIVITY_SNAPSHOT` carrying the full A2UI operation
 * list. The caller is responsible for emitting any surrounding
 * lifecycle events (`RUN_STARTED`, the `renderDashboard`
 * `TOOL_CALL_*`, the matching `TOOL_CALL_RESULT`, `RUN_FINISHED`).
 */
function emitCompiledDashboardEvents(compiled) {
  const events = buildDataStepEvents(compiled.dataSteps);
  events.push({
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: compiled.surfaceId,
    activityType: 'a2ui-surface',
    content: {
      operations: [...compiled.structural, ...compiled.dataModel],
    },
  });
  return events;
}
function buildDataStepEvents(steps) {
  const events = [];
  for (const step of steps) {
    const toolCallId = `data-step-${randomUUID()}`;
    const parentMessageId = randomUUID();
    events.push({
      type: EventType.TOOL_CALL_START,
      parentMessageId,
      toolCallId,
      toolCallName: step.name,
    });
    events.push({
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: JSON.stringify(step.args ?? {}),
    });
    events.push({
      type: EventType.TOOL_CALL_END,
      toolCallId,
    });
    events.push({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      content: JSON.stringify(step.result ?? { ok: true }),
      messageId: randomUUID(),
      role: 'tool',
    });
  }
  return events;
}
function emit(sse, event) {
  return sse.writeSSE({ data: JSON.stringify(event) });
}
// Like `emit`, but yields to the macrotask queue afterwards (dev only)
// so each cached-replay frame is flushed as its own network chunk and
// stays visible in the browser DevTools Network tab. See
// `CACHED_FRAME_DELAY_MS` for why this is needed and how to disable it.
async function emitFrame(sse, event) {
  await emit(sse, event);
  if (CACHED_FRAME_DELAY_MS !== null) {
    await new Promise((resolve) => setTimeout(resolve, CACHED_FRAME_DELAY_MS));
  }
}
function parseAccumulatedSpec(raw) {
  if (!raw) {
    return null;
  }
  let parsed;
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
function isPreventCachingRequested(input) {
  const props = input.forwardedProps;
  if (!props || typeof props !== 'object') {
    return false;
  }
  const value = props.preventCaching;
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.toLowerCase().trim();
    return normalised === '1' || normalised === 'true' || normalised === 'yes';
  }
  return false;
}
async function tryReadDashboardCache(hash) {
  try {
    return await readDashboardCache(hash);
  } catch (err) {
    console.error(`Failed to read dashboard cache (hash=${hash}):`, err);
    return null;
  }
}
async function tryServeFromCache(c, cacheKey, input) {
  const entry = await tryReadDashboardCache(cacheKey);
  if (!entry) {
    return null;
  }
  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(c, async (sse) => {
    await streamCachedDashboard(sse, input, entry.spec);
  });
}
async function handleRenderToolCallEnd(argsBuffer) {
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
function makeRunError(message, code) {
  return { type: 'RUN_ERROR', message, code };
}
function truncate(text, max = 200) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
