import {
  MCPAppsMiddleware,
  type MCPClientConfig,
} from '@ag-ui/mcp-apps-middleware';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { INTERNAL_PLAN_TOOL_NAMES } from '../tools/plan/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';

interface AgUiForwardedProps {
  agentMode?: unknown;
  __proxiedMCPRequest?: unknown;
}

const HIDDEN_TOOLS: Record<string, readonly string[]> = {
  travelRefinementAgent: INTERNAL_PLAN_TOOL_NAMES,
};

const HOTELS_MCP_SERVER: MCPClientConfig = {
  type: 'http',
  url: 'http://127.0.0.1:3002/mcp',
  serverId: 'hotels',
};

const mcpAppsProxy = new MCPAppsMiddleware({
  mcpServers: [HOTELS_MCP_SERVER],
});

function isProxiedMcpRequest(forwardedProps: unknown): boolean {
  const props = forwardedProps as AgUiForwardedProps | undefined;
  return Boolean(props?.__proxiedMCPRequest);
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

  const forwardedProps = parsed.input.forwardedProps as
    | AgUiForwardedProps
    | undefined;
  const mode = forwardedProps?.agentMode;
  let effectiveAgentId: string;
  if (mode === 'plan') {
    effectiveAgentId = 'planningAgent';
  } else if (mode === 'execution') {
    effectiveAgentId = 'ticketingAgent';
  } else {
    effectiveAgentId = agentId ?? '';
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: effectiveAgentId,
    resourceId: parsed.input.threadId,
    requestContext,
    tripwireMessage: 'Sorry, I cannot help with this topic.',
    hiddenToolNames: HIDDEN_TOOLS[effectiveAgentId],
  });

  const middleware = isProxiedMcpRequest(parsed.input.forwardedProps)
    ? mcpAppsProxy
    : undefined;

  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamAgentEvents(sse, agent, parsed.input, { middleware });
    },
  );
}
