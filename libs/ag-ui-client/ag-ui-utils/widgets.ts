import { MessageProcessor } from '@a2ui/angular';
import type { Types } from '@a2ui/lit/0.8';

import {
  type AgUiChatMessage,
  type AgUiToolCall,
  type AgUiWidget,
} from '../ag-ui-types';
import { replaceMessage } from './messages';

/**
 * Handles tool results that return A2UI `{ surfaceId, messages }` JSON (e.g. `showComponents`).
 */
export function appendA2uiSurfaceFromToolResult(
  messages: AgUiChatMessage[],
  toolCallId: string,
  content: string,
  processor: MessageProcessor,
): AgUiChatMessage[] {
  const parsed = safeParseJson(content);
  const widget = toA2uiWidgetFromToolResult(parsed, toolCallId, processor);
  if (!widget) {
    return messages;
  }
  return appendWidget(messages, toolCallId, widget);
}

/**
 * Handles AG-UI activity snapshots that contain A2UI surface operations.
 */
export function appendA2uiSurfaceFromActivitySnapshot(
  messages: AgUiChatMessage[],
  messageId: string,
  content: unknown,
  processor: MessageProcessor,
): AgUiChatMessage[] {
  const widget = toA2uiWidgetFromActivitySnapshot(
    content,
    messageId,
    processor,
  );
  if (!widget) {
    return messages;
  }

  return appendWidget(messages, messageId, widget);
}

function toA2uiWidgetFromToolResult(
  value: unknown,
  toolCallId: string,
  processor: MessageProcessor,
): AgUiWidget | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('surfaceId' in value) ||
    !('messages' in value) ||
    !Array.isArray((value as { messages?: unknown }).messages)
  ) {
    return null;
  }

  const result = value as {
    surfaceId: string;
    messages: Types.ServerToClientMessage[];
  };
  processor.processMessages(result.messages);
  return {
    name: `a2ui_${toolCallId}`,
    a2uiSurfaceId: result.surfaceId,
    a2uiSurface: processor.getSurfaces().get(result.surfaceId) ?? null,
  };
}

function toA2uiWidgetFromActivitySnapshot(
  value: unknown,
  messageId: string,
  processor: MessageProcessor,
): AgUiWidget | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('operations' in value) ||
    !Array.isArray((value as { operations?: unknown }).operations)
  ) {
    return null;
  }

  const result = value as {
    operations: Types.ServerToClientMessage[];
  };
  processor.processMessages(result.operations);

  const surfaceId = getRenderedSurfaceId(result.operations);
  if (!surfaceId) {
    return null;
  }

  return {
    name: `a2ui_${messageId}`,
    a2uiSurfaceId: surfaceId,
    a2uiSurface: processor.getSurfaces().get(surfaceId) ?? null,
  };
}

function widgetsContentEqual(a: AgUiWidget, b: AgUiWidget): boolean {
  return a.name === b.name && a.a2uiSurfaceId === b.a2uiSurfaceId;
}

function appendWidget(
  messages: AgUiChatMessage[],
  anchorId: string,
  widget: AgUiWidget,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const matchesToolCall = message.toolCalls.some(
      (toolCall: AgUiToolCall) => toolCall.id === anchorId,
    );
    const matchesMessage = message.id === anchorId;
    if (!matchesToolCall && !matchesMessage) {
      continue;
    }

    const hasWidget = message.widgets.some((entry: AgUiWidget) =>
      widgetsContentEqual(entry, widget),
    );
    if (hasWidget) {
      return messages;
    }

    return replaceMessage(messages, index, {
      ...message,
      widgets: [...message.widgets, widget],
    });
  }

  const lastAssistantIndex = findLastAssistantMessageIndex(messages);
  if (lastAssistantIndex !== -1) {
    const lastAssistantMessage = messages[lastAssistantIndex];
    const hasWidget = lastAssistantMessage.widgets.some((entry: AgUiWidget) =>
      widgetsContentEqual(entry, widget),
    );
    if (hasWidget) {
      return messages;
    }

    return replaceMessage(messages, lastAssistantIndex, {
      ...lastAssistantMessage,
      widgets: [...lastAssistantMessage.widgets, widget],
    });
  }

  return [
    ...messages,
    {
      id: anchorId,
      role: 'assistant',
      content: '',
      widgets: [widget],
      toolCalls: [],
    },
  ];
}

function findLastAssistantMessageIndex(messages: AgUiChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant') {
      return index;
    }
  }

  return -1;
}

function getRenderedSurfaceId(
  operations: Types.ServerToClientMessage[],
): string | null {
  for (const operation of operations) {
    if ('beginRendering' in operation && operation.beginRendering?.surfaceId) {
      return operation.beginRendering.surfaceId;
    }

    if ('surfaceUpdate' in operation && operation.surfaceUpdate?.surfaceId) {
      return operation.surfaceUpdate.surfaceId;
    }

    if (
      'dataModelUpdate' in operation &&
      operation.dataModelUpdate?.surfaceId
    ) {
      return operation.dataModelUpdate.surfaceId;
    }
  }

  return null;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
