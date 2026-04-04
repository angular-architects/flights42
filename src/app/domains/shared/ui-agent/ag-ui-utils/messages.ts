import { randomUUID } from '@ag-ui/client';
import { type ResourceStreamItem } from '@angular/core';

import { type AgUiChatMessage } from '../ag-ui-types';

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
