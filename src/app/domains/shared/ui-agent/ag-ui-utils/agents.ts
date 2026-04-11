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
} from '../ag-ui-types';
import {
  appendErrorMessage,
  readMessages,
  upsertAssistantMessage,
} from './messages';
import {
  addToolResultMessage,
  completeToolCall,
  executePendingTools,
  keepToolCallMessages,
  normalizeAgentMessagesForRun,
  type PendingToolExecution,
  updateToolCall,
  upsertToolCall,
} from './tools';
import { appendWidgetsFromToolResult } from './widgets';

export interface RunAgentOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  model?: string;
  useServerMemory?: boolean;
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
    messageStream,
  } = options;
  const { runId } = options;

  const pendingLocalCalls: PendingToolExecution[] = [];
  const followUpToolCallIds: string[] = [];

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

        return {
          value: upsertToolCall(messages, {
            id: event.toolCallId,
            name: event.toolCallName,
            args: {},
            status: 'pending',
          }),
        };
      });
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

      if (toolCallName === 'showComponents') {
        const showComponentsTool = toolMap.get(toolCallName);

        try {
          showComponentsTool?.parse?.(normalizedToolCallArgs);
        } catch {
          messageStream.update((item) => ({
            value: updateToolCall(readMessages(item), event.toolCallId, {
              name: toolCallName,
              args: normalizedToolCallArgs,
              status: 'pending',
            }),
          }));

          if (showComponentsTool) {
            pendingLocalCalls.push({
              toolCallId: event.toolCallId,
              toolCallName,
              toolCallArgs: normalizedToolCallArgs,
            });
            followUpToolCallIds.push(event.toolCallId);
          }

          return;
        }

        messageStream.update((item) => ({
          value: updateToolCall(readMessages(item), event.toolCallId, {
            name: toolCallName,
            args: normalizedToolCallArgs,
          }),
        }));

        messageStream.update((item) => ({
          value: appendWidgetsFromToolResult(
            readMessages(item),
            event.toolCallId,
            JSON.stringify(normalizedToolCallArgs),
            componentMap,
          ),
        }));

        messageStream.update((item) => ({
          value: completeToolCall(readMessages(item), event.toolCallId),
        }));

        addToolResultMessage(agent, event.toolCallId, { ok: true });
        followUpToolCallIds.push(event.toolCallId);

        return;
      }

      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: normalizedToolCallArgs,
          status: 'pending',
        }),
      }));

      if (!toolMap.has(toolCallName)) {
        return;
      }

      pendingLocalCalls.push({
        toolCallId: event.toolCallId,
        toolCallName,
        toolCallArgs: normalizedToolCallArgs,
      });
      followUpToolCallIds.push(event.toolCallId);
    },
    onToolCallResultEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: completeToolCall(readMessages(item), event.toolCallId),
      }));
    },
    onRunErrorEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          event.message || 'Unknown AG-UI run error',
        ),
      }));
    },
    onRunFailed: ({ error }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          error instanceof Error ? error.message : 'Unknown AG-UI run failure',
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

  await agent.runAgent(
    {
      runId,
      tools: toolsToOffer,
      forwardedProps: model ? { modelHint: model } : undefined,
    },
    subscriber,
  );

  return {
    pendingLocalCalls,
    followUpToolCallIds,
  };
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
      messageStream,
    });

    if (useServerMemory) {
      agent.setMessages(
        keepToolCallMessages(agent.messages, runResult.followUpToolCallIds),
      );
    }

    const executedAnyTool = await executePendingTools({
      agent,
      toolMap,
      componentMap,
      environmentInjector,
      pendingLocalCalls: runResult.pendingLocalCalls,
      messageStream,
    });

    done = !executedAnyTool && runResult.followUpToolCallIds.length === 0;
    currentRunId = randomUUID();
  }
}
