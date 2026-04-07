import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiMcpAppsSnapshotContent,
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

export function upsertWidgetFromActivitySnapshot(
  messages: AgUiChatMessage[],
  messageId: string,
  activityType: string,
  content: unknown,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  if (activityType !== 'mcp-apps') {
    return messages;
  }

  const widget = toMcpAppsWidget(content, componentMap);
  if (!widget) {
    return messages;
  }

  const existingIndex = messages.findIndex(
    (message) => message.id === messageId,
  );
  if (existingIndex === -1) {
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

  const existingMessage = messages[existingIndex];
  if (existingMessage.role !== 'assistant') {
    return messages;
  }

  const nextWidgets = existingMessage.widgets.filter(
    (entry) => entry.name !== widget.name,
  );

  return replaceMessage(messages, existingIndex, {
    ...existingMessage,
    widgets: [...nextWidgets, widget],
  });
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
      (entry: AgUiWidget) => entry.id === widget.id,
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
          id: `${toolCallId}-0`,
          name,
          component,
          props: parsed as Record<string, unknown>,
        },
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
    id: `${toolCallId}-${index}`,
    name: componentName,
    component,
    props: widget.props as Record<string, unknown>,
  };
}

function toMcpAppsWidget(
  value: unknown,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget | null {
  if (!isMcpAppsSnapshotContent(value)) {
    return null;
  }

  const componentName = 'mcpAppsWidget';
  const component = componentMap.get(componentName)?.component;
  if (!component) {
    return null;
  }

  return {
    name: componentName,
    component,
    props: { data: value },
  };
}

function isMcpAppsSnapshotContent(
  value: unknown,
): value is AgUiMcpAppsSnapshotContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { serverId?: unknown }).serverId === 'string' &&
    typeof (value as { resourceUri?: unknown }).resourceUri === 'string' &&
    typeof (value as { toolInput?: unknown }).toolInput === 'object' &&
    (value as { toolInput?: unknown }).toolInput !== null &&
    isCallToolResult((value as { result?: unknown }).result)
  );
}

function isCallToolResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
