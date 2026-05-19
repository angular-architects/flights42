import {
  type BaseEvent,
  EventType,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { getExtendedLocalAgent } from '../../../../libs/ag-ui-server/index.js';
import { compileDashboard } from '../dashboard-dsl/compile-dashboard.js';
import type { DataStep } from '../dashboard-dsl/compile-dashboard.js';
import type { DashboardSpec } from '../dashboard-dsl/dashboard-spec.js';
import {
  consumeRecordedRun,
  peekRecordedRun,
} from '../dashboard-dsl/spec-channel.js';
import {
  computeDashboardRequestHash,
  type DashboardCacheEntry,
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
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
    const entry = await tryReadDashboardCache(cacheKey);
    if (entry) {
      return streamSSE(c, async (sse) => {
        await streamCachedDashboard(sse, input, entry.spec);
      });
    }
  }

  // `renderDashboard` stays out of the internal-tool list on purpose:
  // showing the LLM's tool call (with the chosen DSL spec as args) is
  // exactly the visibility we want in the dashboard's "tool calls"
  // panel. The compiler's data fetches are surfaced separately via
  // `injectBeforeA2uiSurface` below.
  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: DASHBOARD_AGENT_ID,
    resourceId: DASHBOARD_AGENT_ID,
    requestContext,
  });

  return streamSSE(c, async (sse) => {
    let capturedSurfaceId: string | undefined;

    await streamAgentEvents(sse, agent, input, {
      injectBeforeA2uiSurface: (operations) => {
        const surfaceId = readSurfaceIdFromOperations(operations);
        if (!surfaceId) {
          return [];
        }
        const recorded = peekRecordedRun(surfaceId);
        if (!recorded) {
          return [];
        }
        return buildDataStepEvents(recorded.dataSteps);
      },
      onA2uiSurface: (operations) => {
        capturedSurfaceId ??= readSurfaceIdFromOperations(operations);
      },
    });

    if (!capturedSurfaceId) {
      return;
    }
    const recordedRun = consumeRecordedRun(capturedSurfaceId);
    if (!recordedRun) {
      return;
    }
    try {
      await writeDashboardCache(cacheKey, recordedRun.spec);
    } catch (err) {
      console.error(`Failed to write dashboard cache (hash=${cacheKey}):`, err);
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

  let operations: unknown[];
  let dataSteps: readonly DataStep[];
  try {
    const compiled = await compileDashboard(spec);
    operations = [...compiled.structural, ...compiled.dataModel];
    dataSteps = compiled.dataSteps;
  } catch (err) {
    await emit(sse, {
      type: 'RUN_ERROR',
      message: err instanceof Error ? err.message : String(err),
      code: 'run_error',
    } as unknown as BaseEvent);
    return;
  }

  for (const event of buildDataStepEvents(dataSteps)) {
    await emit(sse, event);
  }

  await emit(sse, {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: renderToolCallId,
    activityType: 'a2ui-surface',
    content: { operations },
  } as unknown as BaseEvent);

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

function readSurfaceIdFromOperations(
  operations: readonly unknown[],
): string | undefined {
  for (const op of operations) {
    if (!op || typeof op !== 'object') continue;
    const candidate = op as {
      createSurface?: { surfaceId?: unknown };
      updateComponents?: { surfaceId?: unknown };
      updateDataModel?: { surfaceId?: unknown };
    };
    const surfaceId =
      candidate.createSurface?.surfaceId ??
      candidate.updateComponents?.surfaceId ??
      candidate.updateDataModel?.surfaceId;
    if (typeof surfaceId === 'string') {
      return surfaceId;
    }
  }
  return undefined;
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
