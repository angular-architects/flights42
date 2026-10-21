import type { RunAgentInput } from '@ag-ui/client';
import { MastraAgent as AgUiAgent } from '@ag-ui/mastra';
import type { Agent, AgentExecutionOptionsBase } from '@mastra/core/agent';
import type { RequestContext } from '@mastra/core/request-context';
import type { ContextWithMastra } from '@mastra/core/server';

import { agUiRouteConfig } from './ag-ui-route-config.js';

type StreamMessages = Parameters<Agent['stream']>[0];
type StreamOptions = AgentExecutionOptionsBase<unknown> & {
  structuredOutput?: never;
};

export interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

export type ParseRunAgentInputResult =
  { ok: true; input: RunAgentInput } | { ok: false; response: Response };

// Parse JSON body as RunAgentInput; check threadId, runId and messages.
export async function parseRunAgentInput(
  c: ContextWithMastra,
): Promise<ParseRunAgentInputResult> {
  let input: RunAgentInput;
  try {
    input = (await c.req.json()) as RunAgentInput;
  } catch {
    return {
      ok: false,
      response: c.json(
        { error: 'invalid_request', message: 'Invalid JSON body' },
        400,
      ),
    };
  }

  if (!input?.threadId || !input?.runId || !Array.isArray(input.messages)) {
    return {
      ok: false,
      response: c.json(
        {
          error: 'invalid_request',
          message: 'Missing threadId, runId, or messages',
        },
        400,
      ),
    };
  }

  return { ok: true, input };
}

// Remove once @ag-ui/mastra omits memory args for agents without memory:
// https://github.com/ag-ui-protocol/ag-ui/issues/3123
export function withoutMemoryArgs(agent: Agent): Agent {
  if (agent.hasOwnMemory()) {
    return agent;
  }
  return new Proxy(agent, {
    get(target, property) {
      if (property === 'stream') {
        return (messages: StreamMessages, options?: StreamOptions) =>
          target.stream(messages, { ...options, memory: undefined });
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export interface AgUiAgentOptions {
  agentId: string;
  mastraAgent: Agent;
  input: RunAgentInput;
  requestContext: RequestContext;
  abortSignal?: AbortSignal;
}

// Wraps the Mastra agent for one request: route config (middlewares,
// untilIdle), thread-scoped memory, abort on client disconnect.
export function toAgUiAgent({
  agentId,
  mastraAgent,
  input,
  requestContext,
  abortSignal,
}: AgUiAgentOptions): AgUiAgent {
  const { untilIdle, middlewares = [] } = agUiRouteConfig[agentId] ?? {};
  const agUiAgent = new AgUiAgent({
    agentId,
    agent: withoutMemoryArgs(mastraAgent),
    resourceId: input.threadId,
    requestContext,
    threadId: input.threadId,
    initialMessages: input.messages,
    initialState: input.state,
    ...(untilIdle ? { untilIdle: true } : {}),
  }).use(...middlewares);
  abortSignal?.addEventListener('abort', () => agUiAgent.abortRun(), {
    once: true,
  });
  return agUiAgent;
}
