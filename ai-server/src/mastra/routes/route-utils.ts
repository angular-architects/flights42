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
type ResumeOptions = StreamOptions & { toolCallId?: string };

export interface SseWriter {
  writeSSE(message: { data: string }): Promise<void>;
}

export type ParseRunAgentInputResult =
  { ok: true; input: RunAgentInput } | { ok: false; response: Response };

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

function withOverrides(
  agent: Agent,
  overrides: Record<string, unknown>,
): Agent {
  return new Proxy(agent, {
    get(target, property) {
      if (typeof property === 'string' && property in overrides) {
        return overrides[property];
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function withoutMemoryArgs(agent: Agent): Agent {
  if (agent.hasOwnMemory()) {
    return agent;
  }
  const stream = (messages: StreamMessages, options?: StreamOptions) =>
    agent.stream(messages, { ...options, memory: undefined });
  return withOverrides(agent, { stream });
}

export function withAbortSignal(agent: Agent, abortSignal: AbortSignal): Agent {
  const stream = (messages: StreamMessages, options?: StreamOptions) =>
    agent.stream(messages, { ...options, abortSignal });
  const resumeStream = (resumeData: unknown, options: ResumeOptions) =>
    agent.resumeStream(resumeData, { ...options, abortSignal });
  return withOverrides(agent, { stream, resumeStream });
}

export interface AgUiAgentOptions {
  agentId: string;
  mastraAgent: Agent;
  input: RunAgentInput;
  requestContext: RequestContext;
  abortSignal?: AbortSignal;
}

export function toAgUiAgent({
  agentId,
  mastraAgent,
  input,
  requestContext,
  abortSignal,
}: AgUiAgentOptions): AgUiAgent {
  const { untilIdle, middlewares = [] } = agUiRouteConfig[agentId] ?? {};
  const base = withoutMemoryArgs(mastraAgent);
  const agent = abortSignal ? withAbortSignal(base, abortSignal) : base;
  return new AgUiAgent({
    agentId,
    agent,
    resourceId: input.threadId,
    requestContext,
    threadId: input.threadId,
    initialMessages: input.messages,
    initialState: input.state,
    ...(untilIdle ? { untilIdle: true } : {}),
  }).use(...middlewares);
}
