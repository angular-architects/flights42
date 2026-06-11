import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';

import { type AgUiChatMessage, type AgUiWidget } from '../ag-ui-types';
import { replaceMessage } from './messages';

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
