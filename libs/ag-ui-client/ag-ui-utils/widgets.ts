import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';

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
  renderer: A2uiRendererService,
): AgUiChatMessage[] {
  const parsed = safeParseJson(content);
  const widget = toA2uiWidgetFromToolResult(parsed, toolCallId, renderer);
  if (!widget) {
    return messages;
  }
  return appendWidget(messages, toolCallId, widget);
}

/**
 * Handles AG-UI activity snapshots that contain A2UI surface operations.
 *
 * Always renders the widget as its own standalone assistant message so it
 * is not accidentally attached to an unrelated tool-call bubble.
 */
export function appendA2uiSurfaceFromActivitySnapshot(
  messages: AgUiChatMessage[],
  messageId: string,
  content: unknown,
  renderer: A2uiRendererService,
): AgUiChatMessage[] {
  const widget = toA2uiWidgetFromActivitySnapshot(content, messageId, renderer);
  if (!widget) {
    return messages;
  }

  return appendStandaloneWidget(messages, messageId, widget);
}

function appendStandaloneWidget(
  messages: AgUiChatMessage[],
  messageId: string,
  widget: AgUiWidget,
): AgUiChatMessage[] {
  const existingIndex = messages.findIndex(
    (message) => message.id === messageId,
  );

  if (existingIndex !== -1) {
    const existing = messages[existingIndex];
    if (existing.role !== 'assistant') {
      return messages;
    }

    const hasWidget = existing.widgets.some((entry: AgUiWidget) =>
      widgetsContentEqual(entry, widget),
    );
    if (hasWidget) {
      return messages;
    }

    return replaceMessage(messages, existingIndex, {
      ...existing,
      widgets: [...existing.widgets, widget],
    });
  }

  return [
    ...messages,
    {
      id: messageId,
      role: 'assistant',
      content: '',
      widgets: [widget],
      toolCalls: [],
    },
  ];
}

function toA2uiWidgetFromToolResult(
  value: unknown,
  toolCallId: string,
  renderer: A2uiRendererService,
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
    messages: A2uiMessage[];
  };
  renderer.processMessages(result.messages);
  if (!renderer.surfaceGroup.getSurface(result.surfaceId)) {
    return null;
  }

  return {
    name: `a2ui_${toolCallId}`,
    a2uiSurfaceId: result.surfaceId,
  };
}

function toA2uiWidgetFromActivitySnapshot(
  value: unknown,
  messageId: string,
  renderer: A2uiRendererService,
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
    operations: A2uiMessage[];
  };
  renderer.processMessages(result.operations);

  const surfaceId = getRenderedSurfaceId(result.operations);
  if (!surfaceId || !renderer.surfaceGroup.getSurface(surfaceId)) {
    return null;
  }

  return {
    name: `a2ui_${messageId}`,
    a2uiSurfaceId: surfaceId,
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

function getRenderedSurfaceId(operations: A2uiMessage[]): string | null {
  for (const operation of operations) {
    if ('createSurface' in operation && operation.createSurface.surfaceId) {
      return operation.createSurface.surfaceId;
    }

    if (
      'updateComponents' in operation &&
      operation.updateComponents.surfaceId
    ) {
      return operation.updateComponents.surfaceId;
    }

    if ('updateDataModel' in operation && operation.updateDataModel.surfaceId) {
      return operation.updateDataModel.surfaceId;
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
