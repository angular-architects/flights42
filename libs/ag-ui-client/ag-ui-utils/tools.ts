import { type HttpAgent, type Message, randomUUID } from '@ag-ui/client';
import {
  EnvironmentInjector,
  type ResourceStreamItem,
  runInInjectionContext,
  type WritableSignal,
} from '@angular/core';
import { z } from 'zod';

import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
  type AgUiResumeRequest,
  type AgUiToolCall,
} from '../ag-ui-types';
import { readMessages, replaceMessage } from './messages';
import { appendWidgetsFromPendingToolResult } from './widgets';

type AssistantMessage = Extract<Message, { role: 'assistant' }>;
type ToolMessage = Extract<Message, { role: 'tool' }>;
type AssistantToolCall = NonNullable<AssistantMessage['toolCalls']>[number];

export interface PendingRun {
  id: string;
  resume?: AgUiResumeRequest;
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

export function addToolResultMessage(
  agent: HttpAgent,
  toolCallId: string,
  result: unknown,
): void {
  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId,
    content: JSON.stringify(result),
  });
}

export function normalizeAgentMessagesForRun(messages: Message[]): Message[] {
  const assistantToolCallIds = collectAssistantToolCallIds(messages);
  const resolvedToolCallIds = collectResolvedToolCallIds(
    messages,
    assistantToolCallIds,
  );

  return messages.reduce<Message[]>((result, message) => {
    if (isAssistantMessage(message)) {
      const toolCalls = readToolCalls(message);
      const nextToolCalls = toolCalls.filter((toolCall: AssistantToolCall) =>
        resolvedToolCallIds.has(toolCall.id),
      );
      const hasContent =
        typeof message.content === 'string' &&
        message.content.trim().length > 0;

      if (!hasContent && nextToolCalls.length === 0) {
        return result;
      }

      if (nextToolCalls.length === toolCalls.length) {
        result.push(message);
        return result;
      }

      result.push({ ...message, toolCalls: nextToolCalls });
      return result;
    }

    if (isToolMessage(message)) {
      if (hasResolvedToolCall(message, resolvedToolCallIds)) {
        result.push(message);
      }
      return result;
    }

    result.push(message);
    return result;
  }, []);
}

export function keepToolCallMessages(
  messages: Message[],
  toolCallIds: string[],
): Message[] {
  const requestedToolCallIds = new Set(toolCallIds);

  return messages.reduce<Message[]>((result, message) => {
    if (isAssistantMessage(message)) {
      const toolCalls = readToolCalls(message).filter((toolCall) =>
        requestedToolCallIds.has(toolCall.id),
      );

      if (toolCalls.length === 0) {
        return result;
      }

      result.push({
        ...message,
        toolCalls,
        content: undefined,
      });
      return result;
    }

    if (
      isToolMessage(message) &&
      typeof message.toolCallId === 'string' &&
      requestedToolCallIds.has(message.toolCallId)
    ) {
      result.push(message);
    }

    return result;
  }, []);
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

  let sentAnyToolResult = false;

  for (const pendingCall of pendingLocalCalls) {
    const tool = toolMap.get(pendingCall.toolCallName);
    if (!tool || hasToolResult(agent.messages, pendingCall.toolCallId)) {
      continue;
    }

    try {
      const sentToolResult = await executeTool({
        agent,
        tool,
        componentMap,
        environmentInjector,
        pendingCall,
        messageStream,
      });
      sentAnyToolResult ||= sentToolResult;
    } catch (error) {
      recordToolError({
        agent,
        pendingCall,
        error,
        messageStream,
      });
    }
  }

  return sentAnyToolResult;
}

async function executeTool(options: ExecuteToolOptions): Promise<boolean> {
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

  if (result === undefined) {
    addToolResultMessage(agent, pendingCall.toolCallId, { ok: true });

    messageStream.update((item) => ({
      value: completeToolCall(readMessages(item), pendingCall.toolCallId),
    }));

    return true;
  }

  const serializedResult = JSON.stringify(result);

  addToolResultMessage(agent, pendingCall.toolCallId, result);

  messageStream.update((item) => ({
    value: appendWidgetsFromPendingToolResult(
      completeToolCall(readMessages(item), pendingCall.toolCallId),
      pendingCall,
      serializedResult,
      componentMap,
    ),
  }));

  return true;
}

function recordToolError(options: RecordToolErrorOptions): void {
  const { agent, pendingCall, error, messageStream } = options;
  const message = formatToolErrorMessage(pendingCall.toolCallName, error);

  if (pendingCall.toolCallName === 'showComponents') {
    console.error('AG-UI showComponents call rejected', {
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

function formatToolErrorMessage(toolCallName: string, error: unknown): string {
  if (toolCallName === 'showComponents' && error instanceof z.ZodError) {
    const issues = error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      })
      .join('; ');

    return `Invalid showComponents payload. Expected { components: [{ name, props }] } using only registered components and their exact props. ${issues}`;
  }

  return error instanceof Error ? error.message : 'Tool execution failed';
}

function hasToolResult(messages: Message[], toolCallId: string): boolean {
  return messages.some(
    (message) => message.role === 'tool' && message.toolCallId === toolCallId,
  );
}

function collectAssistantToolCallIds(messages: Message[]): Set<string> {
  const assistantToolCallIds = new Set<string>();

  for (const message of messages) {
    if (!isAssistantMessage(message)) {
      continue;
    }

    for (const toolCall of readToolCalls(message)) {
      assistantToolCallIds.add(toolCall.id);
    }
  }

  return assistantToolCallIds;
}

function collectResolvedToolCallIds(
  messages: Message[],
  assistantToolCallIds: Set<string>,
): Set<string> {
  const resolvedToolCallIds = new Set<string>();

  for (const message of messages) {
    if (!isToolMessage(message) || typeof message.toolCallId !== 'string') {
      continue;
    }

    if (assistantToolCallIds.has(message.toolCallId)) {
      resolvedToolCallIds.add(message.toolCallId);
    }
  }

  return resolvedToolCallIds;
}

function readToolCalls(message: AssistantMessage): AssistantToolCall[] {
  return Array.isArray(message.toolCalls) ? message.toolCalls : [];
}

function hasResolvedToolCall(
  message: ToolMessage,
  resolvedToolCallIds: Set<string>,
): boolean {
  return (
    typeof message.toolCallId === 'string' &&
    resolvedToolCallIds.has(message.toolCallId)
  );
}

function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === 'assistant';
}

function isToolMessage(message: Message): message is ToolMessage {
  return message.role === 'tool';
}
