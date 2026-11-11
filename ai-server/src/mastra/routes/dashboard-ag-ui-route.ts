import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { computeDashboardRequestHash } from '../cache/dashboard-cache.js';
import { streamAgentEvents } from './ag-ui-stream.js';
import { createDashboardTrace } from './dashboard-trace.js';
import {
  createDashboardAgent,
  interceptRenderDashboard,
  isCacheable,
  streamCachedDashboard,
  tryReadDashboardCache,
  tryWriteDashboardCache,
} from './dashboard-utils.js';
import { parseRunAgentInput } from './route-utils.js';

export async function dashboardAgUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const trace = createDashboardTrace();

  // Get Mastra instance and RequestContext.
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  // Parse JSON payload as RunAgentInput; answer 400 if invalid.
  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { input } = parsed;

  // Look up a cached program unless the request opts out of caching.
  const useCache = isCacheable(input);
  const cacheKey = computeDashboardRequestHash(input.messages);
  const cachedExpress = useCache ? await tryReadDashboardCache(cacheKey) : null;

  // Respond with a Server-Sent Events stream.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      if (cachedExpress) {
        // Replay the cached program without calling the LLM.
        await streamCachedDashboard(sse, input, cachedExpress, trace);
        trace.finish(true);
        return;
      }

      // Run dashboard agent; compile its renderDashboard program to A2UI.
      const agUiAgent = createDashboardAgent(
        mastraInstance,
        requestContext,
        input,
      );
      const renderDashboard = interceptRenderDashboard(agUiAgent, trace);
      await streamAgentEvents(sse, agUiAgent, input, renderDashboard);
      trace.finish(false);

      // Cache the program for the next identical request.
      const express = renderDashboard.express();
      if (express && useCache) {
        await tryWriteDashboardCache(cacheKey, express);
      }
    },
  );
}
