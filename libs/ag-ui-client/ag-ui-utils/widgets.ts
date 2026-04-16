import {
  type AgUiActionRegisteredComponent,
  type AgUiActionWidget,
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiMcpAppsSnapshotContent,
  type AgUiRegisteredComponent,
  type AgUiToolCall,
  type AgUiWidgetInstance,
} from '../ag-ui-types';
import { replaceMessage } from './messages';

export function readRegisteredComponents(
  tools: AgUiClientToolDefinition<never>[],
): AgUiRegisteredComponent[] {
  return tools.flatMap((tool) => tool.registeredComponents ?? []);
}

export function upsertActionWidgetForToolCall(
  messages: AgUiChatMessage[],
  toolCall: AgUiToolCall,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const widget = toActionWidget(toolCall, componentMap);
  if (!widget) {
    return removeActionWidget(messages, toolCall.id);
  }

  return appendWidgets(messages, toolCall.id, [widget]);
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

  const widget = toMcpAppsWidget(messageId, content, componentMap);
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
  widgets: AgUiWidgetInstance[],
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
  widget: AgUiWidgetInstance,
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

    const existingWidgetIndex = message.widgets.findIndex(
      (entry: AgUiWidgetInstance) => entry.id === widget.id,
    );
    if (existingWidgetIndex !== -1) {
      const nextWidgets = [...message.widgets];
      nextWidgets[existingWidgetIndex] = widget;

      return replaceMessage(messages, index, {
        ...message,
        widgets: nextWidgets,
      });
    }

    return replaceMessage(messages, index, {
      ...message,
      widgets: [...message.widgets, widget],
    });
  }

  return messages;
}

function removeActionWidget(
  messages: AgUiChatMessage[],
  toolCallId: string,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const nextWidgets = message.widgets.filter(
      (entry) => !(entry.kind === 'action' && entry.toolCallId === toolCallId),
    );

    if (nextWidgets.length === message.widgets.length) {
      continue;
    }

    return replaceMessage(messages, index, {
      ...message,
      widgets: nextWidgets,
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
): AgUiWidgetInstance[] {
  const parsed = safeParseJson(content);

  if (name === 'showComponents') {
    return toRegisteredWidgets(parsed, toolCallId, componentMap);
  }

  if (!name) {
    return [];
  }

  const registeredComponent = componentMap.get(name);
  if (!registeredComponent || registeredComponent.kind === 'action') {
    return [];
  }

  const component = registeredComponent.component;
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
): AgUiWidgetInstance[] {
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
    .filter((widget): widget is AgUiWidgetInstance => widget !== null);
}

function toRegisteredWidget(
  value: unknown,
  toolCallId: string,
  index: number,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidgetInstance | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const widget = value as Partial<{
    name: string;
    props: Record<string, unknown>;
  }>;
  const componentName =
    typeof widget.name === 'string' ? widget.name : undefined;
  const registeredComponent = componentName
    ? componentMap.get(componentName)
    : undefined;
  const component =
    registeredComponent && registeredComponent.kind !== 'action'
      ? registeredComponent.component
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
  messageId: string,
  value: unknown,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidgetInstance | null {
  if (!isMcpAppsSnapshotContent(value)) {
    return null;
  }

  const componentName = 'mcpAppsWidget';
  const registeredComponent = componentMap.get(componentName);
  const component =
    registeredComponent && registeredComponent.kind !== 'action'
      ? registeredComponent.component
      : undefined;
  if (!component) {
    return null;
  }

  return {
    id: `${messageId}-mcp-apps`,
    name: componentName,
    component,
    props: { data: value } as Record<string, unknown>,
  };
}

function toActionWidget(
  toolCall: AgUiToolCall,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiActionWidget | null {
  const registeredComponent = findActionComponent(componentMap, toolCall.name);
  if (!registeredComponent) {
    return null;
  }

  return {
    kind: 'action',
    id: `${toolCall.id}-action`,
    name: registeredComponent.name,
    component: registeredComponent.component,
    toolCallId: toolCall.id,
    data: {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      status: toolCall.status,
      input: toolCall.args,
      result: toolCall.result,
      error: toolCall.error,
    },
  };
}

function findActionComponent(
  componentMap: Map<string, AgUiRegisteredComponent>,
  toolName: string,
): AgUiActionRegisteredComponent | undefined {
  for (const component of componentMap.values()) {
    if (component.kind === 'action' && component.toolName === toolName) {
      return component;
    }
  }

  return undefined;
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
