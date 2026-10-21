import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { computeDashboardRequestHash } from '../cache/dashboard-cache.js';
import { streamAgentEvents } from './ag-ui-stream.js';
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
  // Get Mastra instance and RequestContext.
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  // Parse JSON payload as RunAgentInput; answer 400 if invalid.
  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { input } = parsed;

  // Look up a cached spec unless the request opts out of caching.
  const useCache = isCacheable(input);
  const cacheKey = computeDashboardRequestHash(input.messages);
  const cachedSpec = useCache ? await tryReadDashboardCache(cacheKey) : null;

  // Respond with a Server-Sent Events stream.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      if (cachedSpec) {
        // Replay the cached spec without calling the LLM.
        await streamCachedDashboard(sse, input, cachedSpec);
        return;
      }

      // Run dashboard agent; compile its renderDashboard spec to A2UI.
      const agUiAgent = createDashboardAgent(
        mastraInstance,
        requestContext,
        input,
      );
      const renderDashboard = interceptRenderDashboard(agUiAgent);
      await streamAgentEvents(sse, agUiAgent, input, renderDashboard);

      // Cache the spec for the next identical request.
      const spec = renderDashboard.spec();
      if (spec && useCache) {
        await tryWriteDashboardCache(cacheKey, spec);
      }
    },
  );
}
