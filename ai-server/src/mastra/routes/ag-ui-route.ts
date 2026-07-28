import { getServerHash, MCPAppsMiddleware } from '@ag-ui/mcp-apps-middleware';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { USE_MCP } from '../../../../libs/feature-flags/feature-flags.js';
import { HOTELS_MCP_SERVER_URL } from '../config.js';
import { INTERNAL_PLAN_TOOL_NAMES } from '../tools/plan/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';

const HIDDEN_TOOLS: Record<string, readonly string[]> = {
  travelRefinementAgent: INTERNAL_PLAN_TOOL_NAMES,
};

const showInternalTools = process.env['SHOW_INTERNAL_TOOLS'] === 'true';

const HOTELS_MCP_SERVER_CONFIG = {
  type: 'http',
  url: HOTELS_MCP_SERVER_URL,
  serverId: 'hotels',
} as const;

// The middleware is used ONLY to answer `__proxiedMCPRequest` runs from the
// MCP Apps widget (resources/read, tools/call) without invoking any agent.
// The hotels tools themselves stay native Mastra agent tools; the snapshot
// is emitted by ExtendedMastraAgent (see mcpAppsServerHashes below).
const hotelsMcpProxy = USE_MCP
  ? new MCPAppsMiddleware({ mcpServers: [HOTELS_MCP_SERVER_CONFIG] })
  : undefined;

const mcpAppsServerHashes = USE_MCP
  ? { hotels: getServerHash(HOTELS_MCP_SERVER_CONFIG) }
  : undefined;

function mcpAppsProxyFor(
  forwardedProps: unknown,
): MCPAppsMiddleware | undefined {
  const isProxiedRequest =
    (forwardedProps as { __proxiedMCPRequest?: unknown } | undefined)
      ?.__proxiedMCPRequest !== undefined;
  return isProxiedRequest ? hotelsMcpProxy : undefined;
}

export async function agUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const agentId = c.req.param('agentId');
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const mode = (
    parsed.input.forwardedProps as { agentMode?: unknown } | undefined
  )?.agentMode;
  const effectiveAgentId =
    mode === 'plan'
      ? 'planningAgent'
      : mode === 'execution'
        ? 'ticketingAgent'
        : (agentId ?? '');

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: effectiveAgentId,
    resourceId: parsed.input.threadId,
    requestContext,
    tripwireMessage: 'Sorry, I cannot help with this topic.',
    hiddenToolNames: showInternalTools
      ? undefined
      : HIDDEN_TOOLS[effectiveAgentId],
    mcpAppsServerHashes,
  });

  const middleware = mcpAppsProxyFor(parsed.input.forwardedProps);

  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamAgentEvents(sse, agent, parsed.input, { middleware });
    },
  );
}
