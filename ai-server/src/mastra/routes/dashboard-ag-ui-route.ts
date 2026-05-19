import { EventType, randomUUID, type RunAgentInput } from '@ag-ui/client';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import {
  DEFAULT_INTERNAL_TOOL_NAMES,
  getExtendedLocalAgent,
} from '../../../../libs/ag-ui-server/index.js';
import { compileDashboard } from '../dashboard-dsl/compile-dashboard.js';
import type { DashboardSpec } from '../dashboard-dsl/dashboard-spec.js';
import { consumeRecordedSpec } from '../dashboard-dsl/spec-channel.js';
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

const DASHBOARD_INTERNAL_TOOL_NAMES: readonly string[] = [
  ...DEFAULT_INTERNAL_TOOL_NAMES,
  RENDER_DASHBOARD_TOOL_NAME,
];

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

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: DASHBOARD_AGENT_ID,
    resourceId: DASHBOARD_AGENT_ID,
    requestContext,
    internalToolNames: DASHBOARD_INTERNAL_TOOL_NAMES,
  });

  return streamSSE(c, async (sse) => {
    let capturedSurfaceId: string | undefined;

    await streamAgentEvents(sse, agent, input, {
      onA2uiSurface: (operations) => {
        capturedSurfaceId ??= readSurfaceIdFromOperations(operations);
      },
    });

    if (!capturedSurfaceId) {
      return;
    }
    const recordedSpec = consumeRecordedSpec(capturedSurfaceId);
    if (!recordedSpec) {
      return;
    }
    try {
      await writeDashboardCache(cacheKey, recordedSpec);
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
  await sse.writeSSE({
    data: JSON.stringify({
      type: EventType.RUN_STARTED,
      threadId: input.threadId,
      runId: input.runId,
    }),
  });

  try {
    const compiled = await compileDashboard(spec);
    const operations = [...compiled.structural, ...compiled.dataModel];
    await sse.writeSSE({
      data: JSON.stringify({
        type: EventType.ACTIVITY_SNAPSHOT,
        messageId: randomUUID(),
        activityType: 'a2ui-surface',
        content: { operations },
      }),
    });
  } catch (err) {
    await sse.writeSSE({
      data: JSON.stringify({
        type: 'RUN_ERROR',
        message: err instanceof Error ? err.message : String(err),
        code: 'run_error',
      }),
    });
    return;
  }

  await sse.writeSSE({
    data: JSON.stringify({
      type: EventType.RUN_FINISHED,
      threadId: input.threadId,
      runId: input.runId,
    }),
  });
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
