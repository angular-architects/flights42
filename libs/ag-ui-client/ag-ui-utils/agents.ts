import { A2uiRendererService } from '@a2ui/angular/v0_9';
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
import { z } from 'zod';

import {
  type A2uiCustomCatalog,
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
} from '../ag-ui-types';
import {
  appendErrorMessage,
  readMessages,
  upsertAssistantMessage,
} from './messages';
import {
  completeToolCall,
  executePendingTools,
  keepToolCallMessages,
  normalizeAgentMessagesForRun,
  type PendingToolExecution,
  updateToolCall,
  upsertToolCall,
} from './tools';
import {
  appendA2uiSurfaceFromActivitySnapshot,
  appendA2uiSurfaceFromToolResult,
} from './widgets';

export const A2UI_CATALOG_CONTEXT_DESCRIPTION = 'A2UI Custom Catalog';

export interface RunAgentOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  renderer: A2uiRendererService;
  runId: string;
  model?: string;
  useServerMemory?: boolean;
  a2uiCatalog?: A2uiCustomCatalog;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

function buildCatalogContext(
  catalog: A2uiCustomCatalog | undefined,
): { description: string; value: string }[] | undefined {
  if (!catalog) {
    return undefined;
  }

  const components = catalog.components.reduce<
    Record<string, { description: string; schema: unknown }>
  >((acc, entry) => {
    acc[entry.name] = {
      description: entry.description,
      schema: z.toJSONSchema(entry.schema),
    };
    return acc;
  }, {});

  return [
    {
      description: A2UI_CATALOG_CONTEXT_DESCRIPTION,
      value: JSON.stringify({ catalogId: catalog.id, components }),
    },
  ];
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
    renderer,
    model,
    useServerMemory,
    a2uiCatalog,
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

      followUpToolCallIds.push(event.toolCallId);
    },
    onToolCallResultEvent: ({ event }) => {
      messageStream.update((item) => {
        const messages = readMessages(item);
        const withSurface = appendA2uiSurfaceFromToolResult(
          messages,
          event.toolCallId,
          event.content,
          renderer,
        );
        return {
          value: completeToolCall(withSurface, event.toolCallId),
        };
      });
    },
    onActivitySnapshotEvent: ({ event }) => {
      if (event.activityType !== 'a2ui-surface') {
        return;
      }

      messageStream.update((item) => {
        const messages = readMessages(item);
        const withSurface = appendA2uiSurfaceFromActivitySnapshot(
          messages,
          event.messageId,
          event.content,
          renderer,
        );

        return {
          value: completeToolCall(withSurface, event.messageId),
        };
      });
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
      context: buildCatalogContext(a2uiCatalog),
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
  renderer: A2uiRendererService;
  environmentInjector: EnvironmentInjector;
  runId: string;
  model?: string;
  useServerMemory?: boolean;
  a2uiCatalog?: A2uiCustomCatalog;
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
    renderer,
    environmentInjector,
    runId,
    model,
    useServerMemory,
    a2uiCatalog,
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
      renderer,
      runId: currentRunId,
      model,
      useServerMemory,
      a2uiCatalog,
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
      renderer,
      environmentInjector,
      pendingLocalCalls: runResult.pendingLocalCalls,
      messageStream,
    });

    done = runResult.followUpToolCallIds.length === 0;
    currentRunId = randomUUID();
  }
}
