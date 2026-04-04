import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
  type AgUiToolCall,
  type AgUiWidget,
} from '../ag-ui-types';
import { replaceMessage } from './messages';

export function readRegisteredComponents(
  tools: AgUiClientToolDefinition<never>[],
): AgUiRegisteredComponent[] {
  return tools.flatMap((tool) => tool.registeredComponents ?? []);
}

export function appendWidgetsFromToolResult(
  messages: AgUiChatMessage[],
  toolCallId: string,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const widgets = toWidgets(
    toolNameFor(messages, toolCallId),
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
  const widgets = toWidgets(pendingCall.toolCallName, content, componentMap);

  if (widgets.length === 0) {
    return messages;
  }

  return appendWidgets(messages, pendingCall.toolCallId, widgets);
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

    const hasWidget = message.widgets.some(
      (entry: AgUiWidget) =>
        entry.name === widget.name &&
        JSON.stringify(entry.props) === JSON.stringify(widget.props),
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
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget[] {
  const parsed = safeParseJson(content);

  if (name === 'showComponent') {
    return toRegisteredWidgets(parsed, componentMap);
  }

  if (!name) {
    return [];
  }

  const component = componentMap.get(name)?.component;
  return parsed && typeof parsed === 'object' && component
    ? [{ name, component, props: parsed as Record<string, unknown> }]
    : [];
}

function toRegisteredWidgets(
  value: unknown,
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
    .map((item) => toRegisteredWidget(item, componentMap))
    .filter((widget): widget is AgUiWidget => widget !== null);
}

function toRegisteredWidget(
  value: unknown,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const widget = value as Partial<AgUiWidget>;
  const componentName =
    typeof widget.name === 'string' ? widget.name : undefined;
  const component = componentName
    ? componentMap.get(componentName)?.component
    : undefined;

  if (
    !componentName ||
    !widget.props ||
    typeof widget.props !== 'object' ||
    !component
  ) {
    return null;
  }

  return {
    name: componentName,
    component,
    props: widget.props as Record<string, unknown>,
  };
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
