import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  Middleware,
  type MiddlewareFunction,
  type RunAgentInput,
} from '@ag-ui/client';
import { type Message } from '@ag-ui/core';
import { map, type Observable, tap } from 'rxjs';

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

const sentFilters = new WeakMap<AbstractAgent, SentFilterMiddleware>();

export function attachSentFilter(agent: AbstractAgent): void {
  const middleware = new SentFilterMiddleware();
  sentFilters.set(agent, middleware);
  agent.use(middleware);
}

export function clearSentHistory(agent: AbstractAgent): void {
  sentFilters.get(agent)?.clear();
}
