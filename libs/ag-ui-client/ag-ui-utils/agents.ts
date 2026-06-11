import {
  type AgentSubscriber,
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
  type AgUiRegisteredComponent,
  type AgUiWorkflowStep,
} from '../ag-ui-types';
import {
  appendErrorMessage,
  friendlyErrorMessage,
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
import { upsertWidgetFromActivitySnapshot } from './widgets';

export interface RunAgentOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  model?: string;
  useServerMemory?: boolean;
  forwardedProps?: () => Record<string, unknown>;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RunAgentResult {
  pendingLocalCalls: PendingToolExecution[];
  followUpToolCallIds: string[];
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
    forwardedProps,
    messageStream,
  } = options;
  const { runId } = options;

  const pendingLocalCalls: PendingToolExecution[] = [];
  const followUpToolCallIds: string[] = [];

  // Workflow steps arrive as STEP_STARTED / STEP_FINISHED with only `stepName`.
  // Track them on a synthetic per-run "workflow" message so the UI can render
  // progress without coupling to a specific tool call.
  const workflowMessageId = `workflow-steps:${runId}`;
  let workflowMessageInitialized = false;
  const ensureWorkflowMessage = (
    messages: AgUiChatMessage[],
  ): AgUiChatMessage[] => {
    if (workflowMessageInitialized) {
      return messages;
    }
    workflowMessageInitialized = true;
    return [
      ...messages,
      {
        id: workflowMessageId,
        role: 'assistant',
        content: '',
        widgets: [],
        toolCalls: [],
        workflowSteps: [],
      },
    ];
  };
  const updateWorkflowSteps = (
    messages: AgUiChatMessage[],
    update: (steps: AgUiWorkflowStep[]) => AgUiWorkflowStep[],
  ): AgUiChatMessage[] => {
    const ensured = ensureWorkflowMessage(messages);
    const index = ensured.findIndex(
      (message) => message.id === workflowMessageId,
    );
    if (index === -1) {
      return ensured;
    }
    const message = ensured[index];
    if (message.role !== 'assistant') {
      return ensured;
    }
    const nextSteps = update(message.workflowSteps);
    if (nextSteps === message.workflowSteps) {
      return ensured;
    }
    const next = [...ensured];
    next[index] = { ...message, workflowSteps: nextSteps };
    return next;
  };

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
    onStepStartedEvent: ({ event }) => {
      const stepName = (event as { stepName?: string }).stepName;
      if (!stepName) {
        return;
      }
      messageStream.update((item) => ({
        value: updateWorkflowSteps(readMessages(item), (steps) => {
          if (steps.some((step) => step.name === stepName)) {
            return steps;
          }
          return [...steps, { name: stepName, status: 'pending' }];
        }),
      }));
    },
    onStepFinishedEvent: ({ event }) => {
      const stepName = (event as { stepName?: string }).stepName;
      if (!stepName) {
        return;
      }
      messageStream.update((item) => ({
        value: updateWorkflowSteps(readMessages(item), (steps) => {
          const index = steps.findIndex((step) => step.name === stepName);
          if (index === -1) {
            return [...steps, { name: stepName, status: 'complete' }];
          }
          if (steps[index].status === 'complete') {
            return steps;
          }
          const next = [...steps];
          next[index] = { ...next[index], status: 'complete' };
          return next;
        }),
      }));
    },
    onToolCallStartEvent: ({ event }) => {
      // The server may attach an optional `stepName` field when the call was
      // emitted from inside a workflow step (via the AG-UI bridge). AG-UI's
      // `BaseEvent` strips unknown fields off its TS surface, so we read it
      // through a typed shadow.
      const stepName = (event as { stepName?: unknown }).stepName;

      messageStream.update((item) => ({
        value: upsertToolCall(readMessages(item), {
          id: event.toolCallId,
          name: event.toolCallName,
          args: {},
          status: 'pending' as const,
          ...(typeof stepName === 'string' && stepName.length > 0
            ? { stepName }
            : {}),
        }),
      }));
    },
    onToolCallArgsEvent: ({ event, toolCallName, partialToolCallArgs }) => {
      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: partialToolCallArgs,
        }),
      }));
    },
    onToolCallEndEvent: ({ event, toolCallArgs, toolCallName }) => {
      const normalizedToolCallArgs = toolCallArgs ?? {};

      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: normalizedToolCallArgs,
          status: 'pending',
        }),
      }));

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

      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          status: error ? 'error' : 'complete',
          result,
          error,
        }),
      }));
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
      const message =
        event.code === 'abort'
          ? 'Request was aborted.'
          : event.message || 'Unknown AG-UI run error';

      messageStream.update((item) => ({
        value: appendErrorMessage(
          markPendingToolCallsAsError(readMessages(item)),
          message,
        ),
      }));
    },
    onRunFailed: ({ error }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          markPendingToolCallsAsError(readMessages(item)),
          friendlyErrorMessage(error, 'Unknown AG-UI run failure'),
        ),
      }));
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

  const mergedForwardedProps: Record<string, unknown> = {
    ...(model ? { modelHint: model } : {}),
    ...(forwardedProps?.() ?? {}),
  };

  await agent.runAgent(
    {
      runId,
      tools: toolsToOffer,
      forwardedProps:
        Object.keys(mergedForwardedProps).length > 0
          ? mergedForwardedProps
          : undefined,
    },
    subscriber,
  );

  return {
    pendingLocalCalls,
    followUpToolCallIds,
  };
}

function markPendingToolCallsAsError(
  messages: AgUiChatMessage[],
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

        return updateToolCall(nextMessages, toolCall.id, {
          status: 'error',
          error: 'Tool execution did not complete.',
        });
      },
      currentMessages,
    );
  }, messages);
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
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  runId: string;
  model?: string;
  useServerMemory?: boolean;
  forwardedProps?: () => Record<string, unknown>;
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
    model,
    useServerMemory,
    forwardedProps,
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
      model,
      useServerMemory,
      forwardedProps,
      messageStream,
    });

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
      value: markPendingToolCallsAsError(readMessages(item)),
    }));

    done = runResult.followUpToolCallIds.length === 0;
    currentRunId = randomUUID();
  }
}
