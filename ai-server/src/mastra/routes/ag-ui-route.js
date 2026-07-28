import { MCPAppsMiddleware } from '@ag-ui/mcp-apps-middleware';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import { streamSSE } from 'hono/streaming';
import { USE_MCP } from '../../../../libs/feature-flags/feature-flags.js';
import { HOTELS_MCP_SERVER_URL } from '../config.js';
import { INTERNAL_PLAN_TOOL_NAMES } from '../tools/plan/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';
const HIDDEN_TOOLS = {
  travelRefinementAgent: INTERNAL_PLAN_TOOL_NAMES,
};
const showInternalTools = process.env['SHOW_INTERNAL_TOOLS'] === 'true';
const hotelsMcpApps = USE_MCP
  ? new MCPAppsMiddleware({
      mcpServers: [
        { type: 'http', url: HOTELS_MCP_SERVER_URL, serverId: 'hotels' },
      ],
    })
  : undefined;
function mcpAppsMiddlewareFor(effectiveAgentId, forwardedProps) {
  if (!hotelsMcpApps) {
    return undefined;
  }
  const isProxiedRequest = forwardedProps?.__proxiedMCPRequest !== undefined;
  return effectiveAgentId === 'ticketingAgent' || isProxiedRequest
    ? hotelsMcpApps
    : undefined;
}
export async function agUiRouteHandler(c) {
  const agentId = c.req.param('agentId');
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');
  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }
  const mode = parsed.input.forwardedProps?.agentMode;
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
  });
  const middleware = mcpAppsMiddlewareFor(
    effectiveAgentId,
    parsed.input.forwardedProps,
  );
  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(c, async (sse) => {
    await streamAgentEvents(sse, agent, parsed.input, { middleware });
  });
}
