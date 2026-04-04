import { MessageProcessor } from '@a2ui/angular';
import type { Types } from '@a2ui/lit/0.8';

import {
  type AgUiA2uiWidget,
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiComponentWidget,
  type AgUiRegisteredComponent,
  type AgUiToolCall,
  type AgUiWidget,
  isAgUiA2uiWidget,
  isAgUiComponentWidget,
} from '../ag-ui-types';
import { replaceMessage } from './messages';

export function readRegisteredComponents(
  tools: AgUiClientToolDefinition<never>[],
): AgUiRegisteredComponent[] {
  return tools.flatMap((tool) => tool.registeredComponents ?? []);
}

/**
 * Handles server tool results such as `showComponents` that return A2UI
 * `{ surfaceId, messages }` JSON.
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
): AgUiA2uiWidget | null {
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

export function appendWidgetsFromToolResult(
  messages: AgUiChatMessage[],
  toolCallId: string,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const widgets = toWidgets(
    toolNameFor(messages, toolCallId),
    toolCallId,
    content,
    componentMap,
  );

  if (widgets.length === 0) {
    return messages;
  }

  return appendWidgets(messages, toolCallId, widgets);
}

export function appendWidgetsFromPendingToolResult(
  messages: AgUiChatMessage[],
  pendingCall: { toolCallId: string; toolCallName: string },
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const widgets = toWidgets(
    pendingCall.toolCallName,
    pendingCall.toolCallId,
    content,
    componentMap,
  );

  if (widgets.length === 0) {
    return messages;
  }

  return appendWidgets(messages, pendingCall.toolCallId, widgets);
}

function widgetsContentEqual(a: AgUiWidget, b: AgUiWidget): boolean {
  if (a.name !== b.name) {
    return false;
  }
  if (isAgUiComponentWidget(a) && isAgUiComponentWidget(b)) {
    return JSON.stringify(a.props) === JSON.stringify(b.props);
  }
  if (isAgUiA2uiWidget(a) && isAgUiA2uiWidget(b)) {
    return a.a2uiSurfaceId === b.a2uiSurfaceId;
  }
  return false;
}

function appendWidgets(
  messages: AgUiChatMessage[],
  toolCallId: string,
  widgets: AgUiWidget[],
): AgUiChatMessage[] {
  let nextMessages = messages;

  for (const widget of widgets) {
    nextMessages = appendWidget(nextMessages, toolCallId, widget);
  }

  return nextMessages;
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

function toolNameFor(
  messages: AgUiChatMessage[],
  toolCallId: string,
): string | undefined {
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    const toolCall = message.toolCalls.find(
      (entry: AgUiToolCall) => entry.id === toolCallId,
    );
    if (toolCall) {
      return toolCall.name;
    }
  }

  return undefined;
}

function toWidgets(
  name: string | undefined,
  toolCallId: string,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget[] {
  const parsed = safeParseJson(content);

  if (name === 'showComponents') {
    return toRegisteredWidgets(parsed, toolCallId, componentMap);
  }

  if (!name) {
    return [];
  }

  const component = componentMap.get(name)?.component;
  return parsed && typeof parsed === 'object' && component
    ? [
        {
          name,
          component,
          props: parsed as Record<string, unknown>,
        } satisfies AgUiComponentWidget,
      ]
    : [];
}

function toRegisteredWidgets(
  value: unknown,
  toolCallId: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('components' in value) ||
    !Array.isArray((value as { components?: unknown }).components)
  ) {
    return [];
  }

  const components = (value as { components: unknown[] }).components;
  return components
    .map((item, index) =>
      toRegisteredWidget(item, toolCallId, index, componentMap),
    )
    .filter((widget): widget is AgUiWidget => widget !== null);
}

function toRegisteredWidget(
  value: unknown,
  toolCallId: string,
  index: number,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<AgUiComponentWidget>;
  const componentName = typeof raw.name === 'string' ? raw.name : undefined;
  const component = componentName
    ? componentMap.get(componentName)?.component
    : undefined;

  if (
    !componentName ||
    !raw.props ||
    typeof raw.props !== 'object' ||
    !component
  ) {
    return null;
  }

  return {
    id: `${toolCallId}-${index}`,
    name: componentName,
    component,
    props: raw.props as Record<string, unknown>,
  };
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
