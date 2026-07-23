import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import { INTERNAL_PLAN_TOOL_NAMES } from '../tools/plan/index.js';
import { parseRunAgentInput, streamAgentEvents } from './ag-ui-stream.js';

const HIDDEN_TOOLS: Record<string, readonly string[]> = {
  travelRefinementAgent: INTERNAL_PLAN_TOOL_NAMES,
};

const showInternalTools = process.env['SHOW_INTERNAL_TOOLS'] === 'true';

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
  });

  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamAgentEvents(sse, agent, parsed.input);
    },
  );
}
