import { randomUUID } from '@ag-ui/client';
import { type ResourceStreamItem } from '@angular/core';

import { type AgUiChatMessage } from '../ag-ui-types';

export function readMessages(
  item: ResourceStreamItem<AgUiChatMessage[]>,
): AgUiChatMessage[] {
  return 'value' in item ? item.value : [];
}

/**
 * Scopes a client-side render identity (message id / widget id) to the current
 * run. Tool-call ids are only guaranteed unique *within* a single run — some
 * providers reset them per response — so using them raw as Angular @for track
 * keys lets a later run's card collide with an earlier one and clobber it.
 * Prefixing with the run id keeps the protocol-level toolCallId intact while
 * making the rendered identities globally unique. The runId is constant for the
 * lifetime of a tool call, so the id stays stable across streaming rebuilds.
 */
export function scopeRenderId(runId: string, id: string): string {
  return `${runId}:${id}`;
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
      (toolCall) => toolCall.name !== 'showComponents',
    );
    const hasContent = message.content.trim().length > 0;
    const hasToolCalls = filteredToolCalls.length > 0;
    const hasWidgets = message.widgets.length > 0;
    const hasWorkflowSteps = message.workflowSteps.length > 0;

    if (!hasContent && !hasToolCalls && !hasWidgets && !hasWorkflowSteps) {
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
        workflowSteps: [],
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

export function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === 'AbortError') {
    return true;
  }
  return /abort/i.test(error.message);
}

export function friendlyErrorMessage(error: unknown, fallback: string): string {
  if (isAbortError(error)) {
    return 'Request was aborted.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
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
      workflowSteps: [],
    },
  ];
}
