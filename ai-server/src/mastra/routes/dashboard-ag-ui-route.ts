import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import {
  DEFAULT_INTERNAL_TOOL_NAMES,
  getExtendedLocalAgent,
  RENDER_A2UI_DATA_TOOL_NAME,
} from '../../../../libs/ag-ui-server/index.js';
import {
  DASHBOARD_DATA_REFRESH_CONTEXT_KEY,
  type DashboardDataRefreshContext,
} from '../agents/dashboard-data-agent.js';
import {
  computeDashboardRequestHash,
  type DashboardCacheEntry,
  readDashboardCache,
  writeDashboardCache,
} from '../cache/dashboard-cache.js';
import {
  parseRunAgentInput,
  type SseWriter,
  streamAgentEvents,
} from './ag-ui-stream.js';

const DASHBOARD_AGENT_ID = 'dashboardAgent';
const DASHBOARD_DATA_AGENT_ID = 'dashboardDataAgent';

const DATA_AGENT_INTERNAL_TOOL_NAMES: readonly string[] = [
  ...DEFAULT_INTERNAL_TOOL_NAMES,
  RENDER_A2UI_DATA_TOOL_NAME,
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
      console.info(
        `[dashboard-cache] delta hit for hash=${cacheKey} (run=${input.runId})`,
      );
      return streamSSE(c, async (sse) => {
        await streamDeltaDashboard({
          sse,
          mastra: mastraInstance,
          requestContext,
          input,
          entry,
        });
      });
    }
  }

  if (preventCaching) {
    console.info(
      `[dashboard-cache] bypass-read for hash=${cacheKey} (run=${input.runId}); cache will be refreshed on success`,
    );
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: DASHBOARD_AGENT_ID,
    resourceId: DASHBOARD_AGENT_ID,
    requestContext,
  });

  return streamSSE(c, async (sse) => {
    await streamAgentEvents(sse, agent, input, {
      onA2uiSurface: (operations) => {
        void writeDashboardCache(cacheKey, operations).then(
          (entry) => {
            if (entry) {
              console.info(
                `[dashboard-cache] stored hash=${cacheKey} (run=${input.runId}, ${entry.structural.length} structural / ${entry.dataModel.length} data ops)`,
              );
            } else {
              console.warn(
                `[dashboard-cache] could not split operations for hash=${cacheKey}; cache entry not written`,
              );
            }
          },
          (err: unknown) => {
            console.warn(
              `[dashboard-cache] failed to write hash=${cacheKey}:`,
              err,
            );
          },
        );
      },
    });
  });
}

async function streamDeltaDashboard(args: {
  sse: SseWriter;
  mastra: Parameters<typeof getExtendedLocalAgent>[0]['mastra'];
  requestContext: NonNullable<
    Parameters<typeof getExtendedLocalAgent>[0]['requestContext']
  >;
  input: Parameters<typeof streamAgentEvents>[2];
  entry: DashboardCacheEntry;
}): Promise<void> {
  const { sse, mastra, requestContext, input, entry } = args;

  const refreshContext: DashboardDataRefreshContext = {
    surfaceId: entry.surfaceId,
    dataModelOps: entry.dataModel,
  };
  requestContext.set(DASHBOARD_DATA_REFRESH_CONTEXT_KEY, refreshContext);

  const dataAgent = getExtendedLocalAgent({
    mastra,
    agentId: DASHBOARD_DATA_AGENT_ID,
    resourceId: DASHBOARD_DATA_AGENT_ID,
    requestContext,
    internalToolNames: DATA_AGENT_INTERNAL_TOOL_NAMES,
  });

  // Merge the cached structural ops into the FIRST a2ui-surface snapshot
  // emitted by the data agent. The agent only produces `updateDataModel`
  // ops, so without the prepended structural ops the client would have
  // no surface to apply them to. Doing the merge once (instead of
  // emitting two separate snapshots) means the renderer creates exactly
  // one widget container for the dashboard, avoiding the
  // empty-then-populated double render.
  let merged = false;
  await streamAgentEvents(sse, dataAgent, input, {
    transformA2uiOperations: (operations) => {
      if (merged) {
        return operations;
      }
      merged = true;
      return [...entry.structural, ...operations];
    },
  });
}

function isPreventCachingRequested(
  input: Parameters<typeof streamAgentEvents>[2],
): boolean {
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
    console.warn(`[dashboard-cache] failed to read hash=${hash}:`, err);
    return null;
  }
}
