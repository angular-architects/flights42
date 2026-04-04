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

function widgetsContentEqual(a: AgUiWidget, b: AgUiWidget): boolean {
  return a.name === b.name && a.a2uiSurfaceId === b.a2uiSurfaceId;
}

function appendWidget(
  messages: AgUiChatMessage[],
  toolCallId: string,
  widget: AgUiWidget,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const matchesToolCall = message.toolCalls.some(
      (toolCall: AgUiToolCall) => toolCall.id === toolCallId,
    );
    if (!matchesToolCall) {
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

  return messages;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
