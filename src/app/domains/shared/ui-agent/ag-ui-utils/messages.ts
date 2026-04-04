import { randomUUID } from '@ag-ui/client';
import { type ResourceStreamItem } from '@angular/core';

import { type AgUiChatMessage, type AgUiToolCall } from '../ag-ui-types';

export function readMessages(
  item: ResourceStreamItem<AgUiChatMessage[]>,
): AgUiChatMessage[] {
  return 'value' in item ? item.value : [];
}

export function replaceMessage(
  messages: AgUiChatMessage[],
  index: number,
  message: AgUiChatMessage,
): AgUiChatMessage[] {
  const nextMessages = [...messages];
  nextMessages[index] = message;
  return nextMessages;
}

export function filterPublicMessages(
  messages: AgUiChatMessage[],
): AgUiChatMessage[] {
  return messages.flatMap((message) => {
    const filteredToolCalls = message.toolCalls.filter(
      (toolCall) => toolCall.name !== 'showComponent',
    );
    const hasContent = message.content.trim().length > 0;
    const hasToolCalls = filteredToolCalls.length > 0;
    const hasWidgets = message.widgets.length > 0;

    if (!hasContent && !hasToolCalls && !hasWidgets) {
      return [];
    }

    if (filteredToolCalls.length === message.toolCalls.length) {
      return [message];
    }

    return [{ ...message, toolCalls: filteredToolCalls }];
  });
}

export function upsertAssistantMessage(
  messages: AgUiChatMessage[],
  messageId: string,
  content: string,
): AgUiChatMessage[] {
  const existingIndex = messages.findIndex(
    (message) => message.id === messageId,
  );

  if (existingIndex === -1) {
    return [
      ...messages,
      {
        id: messageId,
        role: 'assistant',
        content,
        widgets: [],
        toolCalls: [],
      },
    ];
  }

  const existingMessage = messages[existingIndex];
  if (existingMessage.role !== 'assistant') {
    return messages;
  }

  return replaceMessage(messages, existingIndex, {
    ...existingMessage,
    content,
  });
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

export function appendErrorMessage(
  messages: AgUiChatMessage[],
  errorMessage: string,
): AgUiChatMessage[] {
  return [
    ...messages,
    {
      id: randomUUID(),
      role: 'error',
      content: errorMessage,
      widgets: [],
      toolCalls: [],
    },
  ];
}
