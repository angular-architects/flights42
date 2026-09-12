import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  Middleware,
  type MiddlewareFunction,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import {
  type Interrupt,
  type Message,
  type RunFinishedEvent,
  type ToolCallResultEvent,
} from '@ag-ui/core';
import { from, map, mergeMap, type Observable, of, tap } from 'rxjs';

function isProxiedMcpRequest(input: RunAgentInput): boolean {
  return Boolean(
    (input.forwardedProps as { __proxiedMCPRequest?: unknown } | undefined)
      ?.__proxiedMCPRequest,
  );
}

export function selectUnsentMessages(
  messages: readonly Message[],
  sentMessageIds: ReadonlySet<string>,
): Message[] {
  const unsent = messages.filter((message) => !sentMessageIds.has(message.id));
  const unsentToolCallIds = new Set(
    unsent
      .filter((message) => message.role === 'tool')
      .map((message) => message.toolCallId),
  );
  if (unsentToolCallIds.size === 0) {
    return unsent;
  }

  const keep = new Set<Message>(unsent);
  for (const message of messages) {
    if (
      message.role === 'assistant' &&
      (message.toolCalls ?? []).some((toolCall) =>
        unsentToolCallIds.has(toolCall.id),
      )
    ) {
      keep.add(message);
    }
  }
  return messages.filter((message) => keep.has(message));
}

export class SentFilterMiddleware extends Middleware {
  private readonly sentMessageIds = new Set<string>();

  override run(
    input: RunAgentInput,
    next: AbstractAgent,
  ): Observable<BaseEvent> {
    if (isProxiedMcpRequest(input)) {
      return next.run(input);
    }

    const messages = selectUnsentMessages(input.messages, this.sentMessageIds);
    this.markSent(input.messages);

    return this.runNextWithState({ ...input, messages }, next).pipe(
      tap(({ event, messages: applied }) => {
        if (event.type === EventType.RUN_FINISHED) {
          this.markSent(applied);
        }
      }),
      map(({ event }) => event),
    );
  }

  clear(): void {
    this.sentMessageIds.clear();
  }

  markSent(messages: readonly { id: string }[]): void {
    for (const message of messages) {
      this.sentMessageIds.add(message.id);
    }
  }
}

export function forwardedPropsMiddleware(
  props: () => Record<string, unknown>,
): MiddlewareFunction {
  return (input, next) =>
    next.run({
      ...input,
      forwardedProps: { ...props(), ...input.forwardedProps },
    });
}

export const developerMessagesAsUser: MiddlewareFunction = (input, next) =>
  next.run({
    ...input,
    messages: input.messages.map((message) =>
      message.role === 'developer'
        ? { ...message, role: 'user' as const }
        : message,
    ),
  });

interface SuspendedToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

interface MastraInterruptMetadata {
  mastra?: {
    toolName?: unknown;
    args?: unknown;
  };
}

function toSuspendedToolCall(interrupt: Interrupt): SuspendedToolCall | null {
  const mastra = (interrupt.metadata as MastraInterruptMetadata | undefined)
    ?.mastra;
  if (!interrupt.toolCallId || typeof mastra?.toolName !== 'string') {
    return null;
  }
  return {
    toolCallId: interrupt.toolCallId,
    toolName: mastra.toolName,
    args: mastra.args,
  };
}

function toolCallEvents(call: SuspendedToolCall): BaseEvent[] {
  return [
    {
      type: EventType.TOOL_CALL_START,
      toolCallId: call.toolCallId,
      toolCallName: call.toolName,
      parentMessageId: randomUUID(),
    },
    {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: call.toolCallId,
      delta: JSON.stringify(call.args ?? {}),
    },
    { type: EventType.TOOL_CALL_END, toolCallId: call.toolCallId },
  ] as BaseEvent[];
}

export class ResumedToolCallMiddleware extends Middleware {
  private readonly suspendedCalls = new Map<string, SuspendedToolCall>();

  override run(
    input: RunAgentInput,
    next: AbstractAgent,
  ): Observable<BaseEvent> {
    const resumedCalls = this.takeResumedCalls(input);

    return next.run(input).pipe(
      mergeMap((event) => {
        if (event.type === EventType.RUN_FINISHED) {
          this.rememberSuspendedCalls(event as RunFinishedEvent);
          return of(event);
        }
        if (event.type === EventType.TOOL_CALL_RESULT) {
          const call = resumedCalls.get(
            (event as ToolCallResultEvent).toolCallId,
          );
          if (call) {
            resumedCalls.delete(call.toolCallId);
            return from([...toolCallEvents(call), event]);
          }
        }
        return of(event);
      }),
    );
  }

  private takeResumedCalls(
    input: RunAgentInput,
  ): Map<string, SuspendedToolCall> {
    const resumed = new Map<string, SuspendedToolCall>();
    for (const entry of input.resume ?? []) {
      const call = this.suspendedCalls.get(entry.interruptId);
      this.suspendedCalls.delete(entry.interruptId);
      if (call && entry.status === 'resolved') {
        resumed.set(call.toolCallId, call);
      }
    }
    return resumed;
  }

  private rememberSuspendedCalls(event: RunFinishedEvent): void {
    if (event.outcome?.type !== 'interrupt') {
      return;
    }
    for (const interrupt of event.outcome.interrupts) {
      const call = toSuspendedToolCall(interrupt);
      if (call) {
        this.suspendedCalls.set(interrupt.id, call);
      }
    }
  }
}

const sentFilters = new WeakMap<AbstractAgent, SentFilterMiddleware>();

export function attachSentFilter(agent: AbstractAgent): void {
  const middleware = new SentFilterMiddleware();
  sentFilters.set(agent, middleware);
  agent.use(middleware);
}

export function clearSentHistory(agent: AbstractAgent): void {
  sentFilters.get(agent)?.clear();
}

export function markMessagesSent(
  agent: AbstractAgent,
  messages: readonly { id: string }[],
): void {
  sentFilters.get(agent)?.markSent(messages);
}
