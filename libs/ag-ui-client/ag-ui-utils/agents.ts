import {
  type AgentSubscriber,
  type BaseEvent,
  EventType,
  type HttpAgent,
  randomUUID,
} from '@ag-ui/client';
import {
  type EnvironmentInjector,
  type ResourceStreamItem,
  type WritableSignal,
} from '@angular/core';

import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiInterrupt,
  type AgUiResumeRequest,
  type AgUiRegisteredComponent,
} from '../ag-ui-types';
import {
  appendErrorMessage,
  readMessages,
  upsertAssistantMessage,
} from './messages';
import {
  executePendingTools,
  keepToolCallMessages,
  normalizeAgentMessagesForRun,
  type PendingToolExecution,
  updateToolCall,
  upsertToolCall,
} from './tools';
import {
  upsertActionWidgetForToolCall,
  upsertWidgetFromActivitySnapshot,
} from './widgets';

interface RunAgentCompatParameters {
  runId?: string;
  tools?: RunAgentInputTool[];
  context?: unknown;
  forwardedProps?: Record<string, unknown>;
  abortController?: AbortController;
  resume?: AgUiResumeRequest;
}

interface RunAgentInputTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface InterruptAwareHttpAgent extends HttpAgent {
  runAgentCompat(
    parameters?: RunAgentCompatParameters,
    subscriber?: AgentSubscriber,
  ): Promise<{
    result: unknown;
    newMessages: unknown[];
  }>;
}

interface InterruptAwareRunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  outcome?: 'success' | 'interrupt';
  interrupt?: AgUiInterrupt;
}

export interface RunAgentOptions {
  agent: InterruptAwareHttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  resume?: AgUiResumeRequest;
  model?: string;
  useServerMemory?: boolean;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RunAgentResult {
  pendingLocalCalls: PendingToolExecution[];
  followUpToolCallIds: string[];
  interrupt: AgUiInterrupt | null;
}

export async function runAgent(
  options: RunAgentOptions,
): Promise<RunAgentResult> {
  const {
    agent,
    tools,
    toolMap,
    componentMap,
    model,
    useServerMemory,
    messageStream,
  } = options;
  const { runId } = options;

  const pendingLocalCalls: PendingToolExecution[] = [];
  const followUpToolCallIds: string[] = [];
  let interrupt: AgUiInterrupt | null = null;

  const subscriber: AgentSubscriber = {
    onTextMessageStartEvent: ({ event }) => {
      if (event.role !== 'assistant') {
        return;
      }

      messageStream.update((item) => ({
        value: upsertAssistantMessage(readMessages(item), event.messageId, ''),
      }));
    },
    onTextMessageContentEvent: ({ event, textMessageBuffer }) => {
      // HttpAgent passes the buffer *before* applying this chunk's delta; full text is buffer + delta.
      const delta =
        event && typeof event === 'object' && 'delta' in event
          ? String((event as { delta?: unknown }).delta ?? '')
          : '';
      const content = `${textMessageBuffer}${delta}`;
      messageStream.update((item) => ({
        value: upsertAssistantMessage(
          readMessages(item),
          event.messageId,
          content,
        ),
      }));
    },
    onTextMessageEndEvent: ({ event, textMessageBuffer }) => {
      messageStream.update((item) => ({
        value: upsertAssistantMessage(
          readMessages(item),
          event.messageId,
          textMessageBuffer,
        ),
      }));
    },
    onToolCallStartEvent: ({ event }) => {
      messageStream.update((item) => {
        const messages = readMessages(item);
        const toolCall = {
          id: event.toolCallId,
          name: event.toolCallName,
          args: {},
          status: 'pending' as const,
        };

        return {
          value: upsertActionWidgetForToolCall(
            upsertToolCall(messages, toolCall),
            toolCall,
            componentMap,
          ),
        };
      });
    },
    onToolCallArgsEvent: ({ event, toolCallName, partialToolCallArgs }) => {
      messageStream.update((item) => {
        const nextMessages = updateToolCall(
          readMessages(item),
          event.toolCallId,
          {
            name: toolCallName,
            args: partialToolCallArgs,
          },
        );
        const toolCall = findToolCall(nextMessages, event.toolCallId);

        return {
          value: toolCall
            ? upsertActionWidgetForToolCall(
                nextMessages,
                toolCall,
                componentMap,
              )
            : nextMessages,
        };
      });
    },
    onToolCallEndEvent: ({ event, toolCallArgs, toolCallName }) => {
      const normalizedToolCallArgs = toolCallArgs ?? {};

      messageStream.update((item) => {
        const nextMessages = updateToolCall(
          readMessages(item),
          event.toolCallId,
          {
            name: toolCallName,
            args: normalizedToolCallArgs,
            status: 'pending',
          },
        );
        const toolCall = findToolCall(nextMessages, event.toolCallId);

        return {
          value: toolCall
            ? upsertActionWidgetForToolCall(
                nextMessages,
                toolCall,
                componentMap,
              )
            : nextMessages,
        };
      });

      const toolDefinition = toolMap.get(toolCallName);
      if (!toolDefinition) {
        return;
      }

      pendingLocalCalls.push({
        toolCallId: event.toolCallId,
        toolCallName,
        toolCallArgs: normalizedToolCallArgs,
      });

      if (toolDefinition.followUpAfterExecution ?? true) {
        followUpToolCallIds.push(event.toolCallId);
      }
    },
    onToolCallResultEvent: ({ event }) => {
      const result = safeParseJson(event.content);
      const error = readToolErrorMessage(result);

      messageStream.update((item) => {
        const nextMessages = updateToolCall(
          readMessages(item),
          event.toolCallId,
          {
            status: error ? 'error' : 'complete',
            result,
            error,
          },
        );
        const toolCall = findToolCall(nextMessages, event.toolCallId);

        return {
          value: toolCall
            ? upsertActionWidgetForToolCall(
                nextMessages,
                toolCall,
                componentMap,
              )
            : nextMessages,
        };
      });
    },
    onActivitySnapshotEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: upsertWidgetFromActivitySnapshot(
          readMessages(item),
          event.messageId,
          event.activityType,
          event.content,
          componentMap,
        ),
      }));
    },
    onRunErrorEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          markPendingToolCallsAsError(readMessages(item), componentMap),
          event.message || 'Unknown AG-UI run error',
        ),
      }));
    },
    onRunFailed: ({ error }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          markPendingToolCallsAsError(readMessages(item), componentMap),
          error instanceof Error ? error.message : 'Unknown AG-UI run failure',
        ),
      }));
    },
    onRunFinishedEvent: ({ event }) => {
      const interruptEvent = event as InterruptAwareRunFinishedEvent;
      const activeInterrupt = interruptEvent.interrupt;
      if (interruptEvent.outcome !== 'interrupt' || !activeInterrupt) {
        return;
      }

      interrupt = activeInterrupt;
      messageStream.update((item) => {
        const nextMessages = updateToolCall(
          readMessages(item),
          activeInterrupt.payload.toolCallId,
          {
            status: 'interrupt',
          },
        );
        const toolCall = findToolCall(
          nextMessages,
          activeInterrupt.payload.toolCallId,
        );

        return {
          value: toolCall
            ? upsertActionWidgetForToolCall(
                nextMessages,
                toolCall,
                componentMap,
              )
            : nextMessages,
        };
      });
    },
  };

  const toolsToOffer = tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));

  agent.setMessages(
    useServerMemory
      ? agent.messages
      : normalizeAgentMessagesForRun(agent.messages),
  );

  await agent.runAgentCompat(
    {
      runId,
      tools: toolsToOffer,
      forwardedProps: model ? { modelHint: model } : undefined,
      resume: options.resume,
    },
    subscriber,
  );

  return {
    pendingLocalCalls,
    followUpToolCallIds,
    interrupt,
  };
}

function markPendingToolCallsAsError(
  messages: AgUiChatMessage[],
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  return messages.reduce<AgUiChatMessage[]>((currentMessages, message) => {
    if (message.role !== 'assistant') {
      return currentMessages;
    }

    return message.toolCalls.reduce<AgUiChatMessage[]>(
      (nextMessages, toolCall) => {
        if (toolCall.status !== 'pending') {
          return nextMessages;
        }

        const updatedMessages = updateToolCall(nextMessages, toolCall.id, {
          status: 'error',
          error: 'Tool execution did not complete.',
        });
        const updatedToolCall = findToolCall(updatedMessages, toolCall.id);

        return updatedToolCall
          ? upsertActionWidgetForToolCall(
              updatedMessages,
              updatedToolCall,
              componentMap,
            )
          : updatedMessages;
      },
      currentMessages,
    );
  }, messages);
}

function findToolCall(messages: AgUiChatMessage[], toolCallId: string) {
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    const toolCall = message.toolCalls.find((entry) => entry.id === toolCallId);
    if (toolCall) {
      return toolCall;
    }
  }

  return undefined;
}

function readToolErrorMessage(content: unknown): string | undefined {
  return content &&
    typeof content === 'object' &&
    'error' in content &&
    typeof (content as { error?: unknown }).error === 'string'
    ? (content as { error: string }).error
    : undefined;
}

function safeParseJson(content: unknown): unknown {
  if (typeof content !== 'string') {
    return content;
  }

  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

export interface RunUntilSettledOptions {
  agent: InterruptAwareHttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  runId: string;
  interrupt: WritableSignal<AgUiInterrupt | null>;
  resume?: AgUiResumeRequest;
  model?: string;
  useServerMemory?: boolean;
  abortSignal: AbortSignal;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
  isLoading: WritableSignal<boolean>;
  maxLocalTurns: number;
}

export async function runUntilSettled(
  options: RunUntilSettledOptions,
): Promise<void> {
  const {
    agent,
    tools,
    toolMap,
    componentMap,
    environmentInjector,
    runId,
    interrupt,
    resume,
    model,
    useServerMemory,
    abortSignal,
    messageStream,
    maxLocalTurns,
  } = options;

  let done = false;
  let currentRunId = runId;
  let turnCount = 0;
  while (!done && !abortSignal.aborted) {
    if (turnCount >= maxLocalTurns) {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          `Local tool turn limit (${maxLocalTurns}) reached.`,
        ),
      }));
      break;
    }

    turnCount += 1;

    const runResult = await runAgent({
      agent,
      tools,
      toolMap,
      componentMap,
      runId: currentRunId,
      resume: turnCount === 1 ? resume : undefined,
      model,
      useServerMemory,
      messageStream,
    });

    if (runResult.interrupt) {
      interrupt.set(runResult.interrupt);
      break;
    }

    if (useServerMemory) {
      agent.setMessages(
        keepToolCallMessages(agent.messages, runResult.followUpToolCallIds),
      );
    }

    await executePendingTools({
      agent,
      toolMap,
      componentMap,
      environmentInjector,
      pendingLocalCalls: runResult.pendingLocalCalls,
      messageStream,
    });

    messageStream.update((item) => ({
      value: markPendingToolCallsAsError(readMessages(item), componentMap),
    }));

    done = runResult.followUpToolCallIds.length === 0;
    currentRunId = randomUUID();
  }
}
