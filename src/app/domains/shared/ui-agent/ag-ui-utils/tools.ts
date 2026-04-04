import { type HttpAgent, type Message, randomUUID } from '@ag-ui/client';
import {
  EnvironmentInjector,
  type ResourceStreamItem,
  runInInjectionContext,
  type WritableSignal,
} from '@angular/core';

import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
  type AgUiToolCall,
} from '../ag-ui-types';
import { readMessages, replaceMessage } from './messages';
import { appendWidgetsFromPendingToolResult } from './widgets';

export interface PendingRun {
  id: string;
}

export interface PendingToolExecution {
  toolCallId: string;
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
}

interface ExecutePendingToolsOptions {
  agent: HttpAgent;
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingLocalCalls: PendingToolExecution[];
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface ExecuteToolOptions {
  agent: HttpAgent;
  tool: AgUiClientToolDefinition<never>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingCall: PendingToolExecution;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RecordToolErrorOptions {
  agent: HttpAgent;
  pendingCall: PendingToolExecution;
  error: unknown;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

export function upsertToolCall(
  messages: AgUiChatMessage[],
  toolCall: AgUiToolCall,
): AgUiChatMessage[] {
  const toolCallMessageIndex = messages.findIndex(
    (message) => message.id === toolCall.id,
  );

  if (toolCallMessageIndex === -1) {
    return [
      ...messages,
      {
        id: toolCall.id,
        role: 'assistant',
        content: '',
        widgets: [],
        toolCalls: [toolCall],
      },
    ];
  }

  const toolCallMessage = messages[toolCallMessageIndex];
  if (toolCallMessage.role !== 'assistant') {
    return messages;
  }

  const existingToolCallIndex = toolCallMessage.toolCalls.findIndex(
    (entry: AgUiToolCall) => entry.id === toolCall.id,
  );
  const nextToolCalls = [...toolCallMessage.toolCalls];

  if (existingToolCallIndex === -1) {
    nextToolCalls.push(toolCall);
  } else {
    nextToolCalls[existingToolCallIndex] = {
      ...nextToolCalls[existingToolCallIndex],
      ...toolCall,
    };
  }

  return replaceMessage(messages, toolCallMessageIndex, {
    ...toolCallMessage,
    toolCalls: nextToolCalls,
  });
}

export function updateToolCall(
  messages: AgUiChatMessage[],
  toolCallId: string,
  patch: Partial<AgUiToolCall>,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const toolCallIndex = message.toolCalls.findIndex(
      (toolCall: AgUiToolCall) => toolCall.id === toolCallId,
    );
    if (toolCallIndex === -1) {
      continue;
    }

    const nextToolCalls = [...message.toolCalls];
    nextToolCalls[toolCallIndex] = {
      ...nextToolCalls[toolCallIndex],
      ...patch,
    };

    return replaceMessage(messages, index, {
      ...message,
      toolCalls: nextToolCalls,
    });
  }

  return messages;
}

export function completeToolCall(
  messages: AgUiChatMessage[],
  toolCallId: string,
): AgUiChatMessage[] {
  return updateToolCall(messages, toolCallId, {
    status: 'complete',
  });
}

export async function executePendingTools(
  options: ExecutePendingToolsOptions,
): Promise<boolean> {
  const {
    agent,
    toolMap,
    componentMap,
    environmentInjector,
    pendingLocalCalls,
    messageStream,
  } = options;

  let executedAnyTool = false;

  for (const pendingCall of pendingLocalCalls) {
    const tool = toolMap.get(pendingCall.toolCallName);
    if (!tool || hasToolResult(agent.messages, pendingCall.toolCallId)) {
      continue;
    }

    executedAnyTool = true;
    try {
      await executeTool({
        agent,
        tool,
        componentMap,
        environmentInjector,
        pendingCall,
        messageStream,
      });
    } catch (error) {
      recordToolError({
        agent,
        pendingCall,
        error,
        messageStream,
      });
    }
  }

  return executedAnyTool;
}

async function executeTool(options: ExecuteToolOptions): Promise<void> {
  const {
    agent,
    tool,
    componentMap,
    environmentInjector,
    pendingCall,
    messageStream,
  } = options;

  const result = await runInInjectionContext(environmentInjector, () =>
    tool.execute(pendingCall.toolCallArgs as never),
  );
  const serializedResult = JSON.stringify(result ?? null);

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: serializedResult,
  });

  messageStream.update((item) => ({
    value: appendWidgetsFromPendingToolResult(
      completeToolCall(readMessages(item), pendingCall.toolCallId),
      pendingCall,
      serializedResult,
      componentMap,
    ),
  }));
}

function recordToolError(options: RecordToolErrorOptions): void {
  const { agent, pendingCall, error, messageStream } = options;
  const message =
    error instanceof Error ? error.message : 'Tool execution failed';

  if (pendingCall.toolCallName === 'showComponent') {
    console.error('AG-UI showComponent call rejected', {
      toolCallId: pendingCall.toolCallId,
      args: pendingCall.toolCallArgs,
      error,
    });
  }

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: JSON.stringify({ error: message }),
    error: message,
  });

  messageStream.update((item) => ({
    value: updateToolCall(readMessages(item), pendingCall.toolCallId, {
      status: 'error',
    }),
  }));
}

function hasToolResult(messages: Message[], toolCallId: string): boolean {
  return messages.some(
    (message) => message.role === 'tool' && message.toolCallId === toolCallId,
  );
}
