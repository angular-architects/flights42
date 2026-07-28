import {
  getServerHash,
  MCPAppsMiddleware,
  type MCPClientConfig,
} from '@ag-ui/mcp-apps-middleware';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { INTERNAL_PLAN_TOOL_NAMES } from '../tools/plan/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';

const HIDDEN_TOOLS: Record<string, readonly string[]> = {
  travelRefinementAgent: INTERNAL_PLAN_TOOL_NAMES,
};

const showInternalTools = process.env['SHOW_INTERNAL_TOOLS'] === 'true';

export interface AgUiRouteOptions {
  mcpAppsServers?: readonly MCPClientConfig[];
}

function hasServerId(
  server: MCPClientConfig,
): server is MCPClientConfig & { serverId: string } {
  return server.serverId !== undefined;
}

function planAgentIdFor(agentId: string): string {
  return agentId.replace(/Agent$/, 'PlanAgent');
}

export function createAgUiRouteHandler(
  options: AgUiRouteOptions = {},
): (c: ContextWithMastra) => Promise<Response> {
  const mcpAppsServers = options.mcpAppsServers ?? [];

  // The middleware is used ONLY to answer `__proxiedMCPRequest` runs from the
  // MCP Apps widget (resources/read, tools/call) without invoking any agent.
  // The MCP tools themselves stay native Mastra agent tools; the snapshot
  // is emitted by ExtendedMastraAgent (see mcpAppsServerHashes below).
  const mcpAppsProxy =
    mcpAppsServers.length > 0
      ? new MCPAppsMiddleware({ mcpServers: [...mcpAppsServers] })
      : undefined;

  const mcpAppsServerHashes = Object.fromEntries(
    mcpAppsServers
      .filter(hasServerId)
      .map((server) => [server.serverId, getServerHash(server)]),
  );

  function mcpAppsProxyFor(
    forwardedProps: unknown,
  ): MCPAppsMiddleware | undefined {
    const isProxiedRequest =
      (forwardedProps as { __proxiedMCPRequest?: unknown } | undefined)
        ?.__proxiedMCPRequest !== undefined;
    return isProxiedRequest ? mcpAppsProxy : undefined;
  }

  return async function agUiRouteHandler(
    c: ContextWithMastra,
  ): Promise<Response> {
    const agentId = c.req.param('agentId') ?? '';
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
      mode === 'plan' ? planAgentIdFor(agentId) : agentId;

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
  };
}
