import { randomUUID } from 'node:crypto';
import { TransformStream } from 'node:stream/web';

import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import type { Middleware, RunAgentInput } from '@ag-ui/client';
import { MastraAgent as AgUiAgent } from '@ag-ui/mastra';
import { MCPAppsMiddleware } from '@ag-ui/mcp-apps-middleware';
import type { Agent, AgentExecutionOptionsBase } from '@mastra/core/agent';
import type { RequestContext } from '@mastra/core/request-context';
import type { ChunkType, MastraModelOutput } from '@mastra/core/stream';

import { agUiRouteConfig } from './ag-ui-route-config.js';

export interface ResumeCommand {
  runId: string;
  toolCallId: string;
  resumeData: unknown;
}

export type TripwireMessage = string | ((reason: string) => string);

export interface RunAdjustments {
  abortSignal?: AbortSignal;
  tripwireMessage?: TripwireMessage;
}

type StreamMessages = Parameters<Agent['stream']>[0];
type StreamOptions = AgentExecutionOptionsBase<unknown> & {
  structuredOutput?: never;
};
type ResumeStreamOptions = Parameters<Agent['resumeStream']>[1];

type ChunkStreamOutput = Pick<MastraModelOutput<undefined>, 'fullStream'>;

const middlewareCache = new Map<string, readonly Middleware[]>();

export function middlewaresFor(agentId: string): readonly Middleware[] {
  const cached = middlewareCache.get(agentId);
  if (cached) {
    return cached;
  }
  const config = agUiRouteConfig[agentId] ?? {};
  const middlewares: Middleware[] = [];
  if (config.mcpServers && config.mcpServers.length > 0) {
    middlewares.push(
      new MCPAppsMiddleware({ mcpServers: [...config.mcpServers] }),
    );
  }
  if (config.a2ui) {
    middlewares.push(new A2UIMiddleware({ injectA2UITool: false }));
  }
  middlewareCache.set(agentId, middlewares);
  return middlewares;
}

export function resolveResumeCommand(
  input: RunAgentInput,
): ResumeCommand | null {
  const entry = input.resume?.find(
    (candidate) => candidate.status === 'resolved',
  );
  if (!entry) {
    return null;
  }
  const separator = entry.interruptId.indexOf('::');
  if (separator < 0) {
    return null;
  }
  return {
    runId: entry.interruptId.slice(0, separator),
    toolCallId: entry.interruptId.slice(separator + 2),
    resumeData: entry.payload,
  };
}

function withStream(agent: Agent, stream: unknown): Agent {
  return new Proxy(agent, {
    get(target, property) {
      if (property === 'stream') {
        return stream;
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function resumingAgent(agent: Agent, command: ResumeCommand): Agent {
  const stream = (_messages: unknown, options?: ResumeStreamOptions) =>
    agent.resumeStream(command.resumeData, {
      ...options,
      runId: command.runId,
      toolCallId: command.toolCallId,
    });
  return withStream(agent, stream);
}

export function withoutMemoryArgs(agent: Agent): Agent {
  if (agent.hasOwnMemory()) {
    return agent;
  }
  const stream = (messages: StreamMessages, options?: StreamOptions) =>
    agent.stream(messages, { ...options, memory: undefined });
  return withStream(agent, stream);
}

export function resolveTripwireMessage(
  message: TripwireMessage,
  reason: string,
): string {
  return typeof message === 'function' ? message(reason) : message;
}

function tripwireAsText(
  chunk: ChunkType,
  message: TripwireMessage,
): ChunkType[] {
  if (chunk.type !== 'tripwire') {
    return [chunk];
  }
  const id = randomUUID();
  const origin = { runId: chunk.runId, from: chunk.from };
  const text = resolveTripwireMessage(message, chunk.payload.reason);
  return [
    { ...origin, type: 'text-start', payload: { id } },
    { ...origin, type: 'text-delta', payload: { id, text } },
    { ...origin, type: 'text-end', payload: { id } },
  ];
}

function withTripwireMessage<T extends ChunkStreamOutput>(
  output: T,
  message: TripwireMessage,
): T {
  return new Proxy(output, {
    get(target, property) {
      if (property === 'fullStream') {
        return target.fullStream.pipeThrough(
          new TransformStream<ChunkType, ChunkType>({
            transform(chunk, controller) {
              for (const mapped of tripwireAsText(chunk, message)) {
                controller.enqueue(mapped);
              }
            },
          }),
        );
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function withRunAdjustments(
  agent: Agent,
  adjustments: RunAdjustments,
): Agent {
  const { abortSignal, tripwireMessage } = adjustments;
  if (!abortSignal && !tripwireMessage) {
    return agent;
  }
  const stream = async (messages: StreamMessages, options?: StreamOptions) => {
    const output = await agent.stream(messages, {
      ...options,
      ...(abortSignal ? { abortSignal } : {}),
    });
    return tripwireMessage
      ? withTripwireMessage(output, tripwireMessage)
      : output;
  };
  return withStream(agent, stream);
}

export async function ensureThread(
  agent: Agent,
  threadId: string,
): Promise<void> {
  const memory = await agent.getMemory();
  if (!memory) {
    return;
  }
  const thread = await memory.getThreadById({ threadId });
  if (thread) {
    return;
  }
  await memory.createThread({ threadId, resourceId: threadId });
}

export interface AgUiAgentOptions {
  agentId: string;
  mastraAgent: Agent;
  threadId: string;
  requestContext: RequestContext;
  resumeCommand: ResumeCommand | null;
  adjustments?: RunAdjustments;
}

export function toAgUiAgent({
  agentId,
  mastraAgent,
  threadId,
  requestContext,
  resumeCommand,
  adjustments,
}: AgUiAgentOptions): AgUiAgent {
  const { untilIdle } = agUiRouteConfig[agentId] ?? {};
  const base = withoutMemoryArgs(mastraAgent);
  const agent = withRunAdjustments(
    resumeCommand ? resumingAgent(base, resumeCommand) : base,
    adjustments ?? {},
  );
  return new AgUiAgent({
    agentId,
    agent,
    resourceId: threadId,
    requestContext,
    ...(untilIdle ? { untilIdle: true } : {}),
  });
}
