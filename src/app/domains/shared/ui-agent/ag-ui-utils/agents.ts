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
  completeToolCall,
  readMessages,
  updateToolCall,
  upsertAssistantMessage,
  upsertToolCall,
} from './messages';
import { executePendingTools, type PendingToolExecution } from './tools';
import { appendWidgetsFromToolResult } from './widgets';

export interface RunAgentOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  model?: string;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

export async function runAgent(
  options: RunAgentOptions,
): Promise<PendingToolExecution[]> {
  const { agent, tools, toolMap, componentMap, model, messageStream } = options;
  const { runId } = options;

  const pendingLocalCalls: PendingToolExecution[] = [];

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

      if (toolCallName === 'showComponent') {
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

  await agent.runAgent(
    {
      runId,
      tools: toolsToOffer,
      forwardedProps: model ? { modelHint: model } : undefined,
    },
    subscriber,
  );

  return pendingLocalCalls;
}

export interface RunUntilSettledOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  runId: string;
  model?: string;
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
    abortSignal,
    messageStream,
    isLoading,
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

    const pendingLocalCalls = await runAgent({
      agent,
      tools,
      toolMap,
      componentMap,
      runId: currentRunId,
      model,
      messageStream,
    });

    const executedAnyTool = await executePendingTools({
      agent,
      toolMap,
      componentMap,
      environmentInjector,
      pendingLocalCalls,
      messageStream,
    });

    done = !executedAnyTool;
    currentRunId = randomUUID();
  }
  isLoading.set(false);
}
