import {
  type AgentSubscriber,
  HttpAgent,
  type Message,
  randomUUID,
} from '@ag-ui/client';
import {
  EnvironmentInjector,
  inject,
  linkedSignal,
  resource,
  type ResourceStreamItem,
  runInInjectionContext,
  signal,
  type WritableSignal,
} from '@angular/core';

import {
  AgUiChatMessage,
  AgUiChatResourceRef,
  AgUiClientToolDefinition,
  AgUiRegisteredComponent,
  AgUiResourceOptions,
  AgUiToolCall,
  AgUiWidget,
} from './ag-ui-types';

interface PendingRun {
  id: string;
}

interface PendingToolExecution {
  toolCallId: string;
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
}

interface RunUntilSettledOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  runId: string;
  model?: string;
  abortSignal: AbortSignal;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
  isLoading: WritableSignal<boolean>;
}

interface ExecutePendingToolsOptions {
  agent: HttpAgent;
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingLocalCalls: PendingToolExecution[];
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface ExecuteToolOptions {
  agent: HttpAgent;
  tool: AgUiClientToolDefinition<never>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingCall: PendingToolExecution;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RecordToolErrorOptions {
  agent: HttpAgent;
  pendingCall: PendingToolExecution;
  error: unknown;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RunAgentOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition<never>[];
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  model?: string;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface StreamOptions {
  params: PendingRun | undefined;
  abortSignal: AbortSignal;
}

interface SendMessageOptions {
  role: 'user';
  content: string;
}

export function agUiResource(
  options: AgUiResourceOptions,
): AgUiChatResourceRef {
  const hideInternal = options.hideInternal ?? true;
  const environmentInjector = inject(EnvironmentInjector);
  const threadId = randomUUID();
  const agent = new HttpAgent({ url: options.url, threadId });
  const tools = options.tools;
  const toolMap = new Map<string, AgUiClientToolDefinition<never>>(
    tools.map((tool: AgUiClientToolDefinition<never>) => [tool.name, tool]),
  );
  const componentMap = new Map<string, AgUiRegisteredComponent>(
    readRegisteredComponents(tools).map((component) => [
      component.name,
      component,
    ]),
  );

  const pendingRun = signal<PendingRun | undefined>(undefined);
  const messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>> =
    signal({
      value: [],
    });

  const isLoading = signal<boolean>(false);

  const stream = async (streamOptions: StreamOptions) => {
    const { params, abortSignal } = streamOptions;

    if (!params) {
      return messageStream.asReadonly();
    }

    isLoading.set(true);

    abortSignal.addEventListener('abort', () => {
      agent.abortRun();
    });

    try {
      runUntilSettled({
        agent,
        tools,
        toolMap,
        componentMap,
        environmentInjector,
        runId: params.id,
        model: options.model,
        abortSignal,
        messageStream,
        isLoading,
      });
    } catch (error) {
      if (!abortSignal.aborted) {
        messageStream.update((item) => ({
          value: appendErrorMessage(
            readMessages(item),
            error instanceof Error ? error.message : 'Unknown AG-UI error',
          ),
        }));
        isLoading.set(false);
      }
    }

    return messageStream.asReadonly();
  };

  const sendMessage = (message: SendMessageOptions): void => {
    const content = message.content.trim();

    if (!content) {
      return;
    }

    if (isLoading()) {
      agent.abortRun();
    }

    const userMessage = {
      id: randomUUID(),
      role: 'user' as const,
      content,
    };

    agent.addMessage(userMessage);

    messageStream.update((item) => ({
      value: [
        ...readMessages(item),
        {
          ...userMessage,
          widgets: [],
          toolCalls: [],
        },
      ],
    }));

    pendingRun.set({ id: randomUUID() });
  };

  const resendMessages = (): void => {
    if (agent.messages.length === 0) {
      return;
    }

    pendingRun.set({ id: randomUUID() });
  };

  const chat = resource<AgUiChatMessage[], PendingRun | undefined>({
    params: () => pendingRun(),
    defaultValue: [],
    stream,
  });
  const publicValue = linkedSignal(() => filterPublicMessages(chat.value()));

  return {
    ...chat,
    value: hideInternal ? publicValue : chat.value,
    isLoading,
    sendMessage,
    resendMessages,
    stop: () => {
      agent.abortRun();
    },
  } satisfies AgUiChatResourceRef;
}

function filterPublicMessages(messages: AgUiChatMessage[]): AgUiChatMessage[] {
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

function readRegisteredComponents(
  tools: AgUiClientToolDefinition<never>[],
): AgUiRegisteredComponent[] {
  return tools.flatMap((tool) => tool.registeredComponents ?? []);
}

async function runUntilSettled(options: RunUntilSettledOptions): Promise<void> {
  const {
    agent,
    tools,
    toolMap,
    componentMap,
    environmentInjector,
    runId,
    model,
    abortSignal,
    messageStream,
    isLoading,
  } = options;

  let done = false;
  let currentRunId = runId;
  while (!done && !abortSignal.aborted) {
    const pendingLocalCalls = await runAgent({
      agent,
      tools,
      toolMap,
      componentMap,
      runId: currentRunId,
      model,
      messageStream,
    });

    const executedAnyTool = await executePendingTools({
      agent,
      toolMap,
      componentMap,
      environmentInjector,
      pendingLocalCalls,
      messageStream,
    });

    done = !executedAnyTool;
    currentRunId = randomUUID();
  }
  isLoading.set(false);
}

async function executePendingTools(
  options: ExecutePendingToolsOptions,
): Promise<boolean> {
  const {
    agent,
    toolMap,
    componentMap,
    environmentInjector,
    pendingLocalCalls,
    messageStream,
  } = options;

  let executedAnyTool = false;

  for (const pendingCall of pendingLocalCalls) {
    const tool = toolMap.get(pendingCall.toolCallName);
    if (!tool || hasToolResult(agent.messages, pendingCall.toolCallId)) {
      continue;
    }

    executedAnyTool = true;
    try {
      await executeTool({
        agent,
        tool,
        componentMap,
        environmentInjector,
        pendingCall,
        messageStream,
      });
    } catch (error) {
      recordToolError({
        agent,
        pendingCall,
        error,
        messageStream,
      });
    }
  }

  return executedAnyTool;
}

async function executeTool(options: ExecuteToolOptions): Promise<void> {
  const {
    agent,
    tool,
    componentMap,
    environmentInjector,
    pendingCall,
    messageStream,
  } = options;

  const result = await runInInjectionContext(environmentInjector, () =>
    tool.execute(pendingCall.toolCallArgs as never),
  );
  const serializedResult = JSON.stringify(result ?? null);

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: serializedResult,
  });

  messageStream.update((item) => ({
    value: appendWidgetsFromPendingToolResult(
      completeToolCall(readMessages(item), pendingCall.toolCallId),
      pendingCall,
      serializedResult,
      componentMap,
    ),
  }));
}

function recordToolError(options: RecordToolErrorOptions): void {
  const { agent, pendingCall, error, messageStream } = options;
  const message =
    error instanceof Error ? error.message : 'Tool execution failed';

  if (pendingCall.toolCallName === 'showComponent') {
    console.error('AG-UI showComponent call rejected', {
      toolCallId: pendingCall.toolCallId,
      args: pendingCall.toolCallArgs,
      error,
    });
  }

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: JSON.stringify({ error: message }),
    error: message,
  });

  messageStream.update((item) => ({
    value: updateToolCall(readMessages(item), pendingCall.toolCallId, {
      status: 'error',
    }),
  }));
}

async function runAgent(
  options: RunAgentOptions,
): Promise<PendingToolExecution[]> {
  const { agent, tools, toolMap, componentMap, model, messageStream } = options;
  const { runId } = options;

  const pendingLocalCalls: PendingToolExecution[] = [];

  const subscriber: AgentSubscriber = {
    onTextMessageStartEvent: ({ event }) => {
      if (event.role !== 'assistant') {
        return;
      }

      messageStream.update((item) => ({
        value: upsertAssistantMessage(readMessages(item), event.messageId, ''),
      }));
    },
    onTextMessageContentEvent: ({ event, textMessageBuffer }) => {
      messageStream.update((item) => ({
        value: upsertAssistantMessage(
          readMessages(item),
          event.messageId,
          textMessageBuffer,
        ),
      }));
    },
    onToolCallStartEvent: ({ event }) => {
      messageStream.update((item) => {
        const messages = readMessages(item);

        return {
          value: upsertToolCall(messages, {
            id: event.toolCallId,
            name: event.toolCallName,
            args: {},
            status: 'pending',
          }),
        };
      });
    },
    onToolCallArgsEvent: ({ event, toolCallName, partialToolCallArgs }) => {
      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: partialToolCallArgs,
        }),
      }));
    },
    onToolCallEndEvent: ({ event, toolCallArgs, toolCallName }) => {
      const normalizedToolCallArgs = toolCallArgs ?? {};

      if (toolCallName === 'showComponent') {
        messageStream.update((item) => ({
          value: appendWidgetsFromToolResult(
            readMessages(item),
            event.toolCallId,
            JSON.stringify(normalizedToolCallArgs),
            componentMap,
          ),
        }));
      }

      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: normalizedToolCallArgs,
          status: 'pending',
        }),
      }));

      if (!toolMap.has(toolCallName)) {
        return;
      }

      pendingLocalCalls.push({
        toolCallId: event.toolCallId,
        toolCallName,
        toolCallArgs: normalizedToolCallArgs,
      });
    },
    onToolCallResultEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: completeToolCall(readMessages(item), event.toolCallId),
      }));
    },
    onRunErrorEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          event.message || 'Unknown AG-UI run error',
        ),
      }));
    },
    onRunFailed: ({ error }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          error instanceof Error ? error.message : 'Unknown AG-UI run failure',
        ),
      }));
    },
  };

  const toolsToOffer = tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));

  await agent.runAgent(
    {
      runId,
      tools: toolsToOffer,
      forwardedProps: model ? { modelHint: model } : undefined,
    },
    subscriber,
  );

  return pendingLocalCalls;
}

function hasToolResult(messages: Message[], toolCallId: string): boolean {
  return messages.some(
    (message) => message.role === 'tool' && message.toolCallId === toolCallId,
  );
}

function upsertAssistantMessage(
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

function upsertToolCall(
  messages: AgUiChatMessage[],
  toolCall: AgUiToolCall,
): AgUiChatMessage[] {
  const toolCallMessageIndex = messages.findIndex(
    (message) => message.id === toolCall.id,
  );

  if (toolCallMessageIndex === -1) {
    return [
      ...messages,
      {
        id: toolCall.id,
        role: 'assistant',
        content: '',
        widgets: [],
        toolCalls: [toolCall],
      },
    ];
  }

  const toolCallMessage = messages[toolCallMessageIndex];
  if (toolCallMessage.role !== 'assistant') {
    return messages;
  }

  const existingToolCallIndex = toolCallMessage.toolCalls.findIndex(
    (entry: AgUiToolCall) => entry.id === toolCall.id,
  );
  const nextToolCalls = [...toolCallMessage.toolCalls];

  if (existingToolCallIndex === -1) {
    nextToolCalls.push(toolCall);
  } else {
    nextToolCalls[existingToolCallIndex] = {
      ...nextToolCalls[existingToolCallIndex],
      ...toolCall,
    };
  }

  return replaceMessage(messages, toolCallMessageIndex, {
    ...toolCallMessage,
    toolCalls: nextToolCalls,
  });
}

function updateToolCall(
  messages: AgUiChatMessage[],
  toolCallId: string,
  patch: Partial<AgUiToolCall>,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const toolCallIndex = message.toolCalls.findIndex(
      (toolCall: AgUiToolCall) => toolCall.id === toolCallId,
    );
    if (toolCallIndex === -1) {
      continue;
    }

    const nextToolCalls = [...message.toolCalls];
    nextToolCalls[toolCallIndex] = {
      ...nextToolCalls[toolCallIndex],
      ...patch,
    };

    return replaceMessage(messages, index, {
      ...message,
      toolCalls: nextToolCalls,
    });
  }

  return messages;
}

function completeToolCall(
  messages: AgUiChatMessage[],
  toolCallId: string,
): AgUiChatMessage[] {
  return updateToolCall(messages, toolCallId, {
    status: 'complete',
  });
}

function appendWidgetsFromToolResult(
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

function appendWidgetsFromPendingToolResult(
  messages: AgUiChatMessage[],
  pendingCall: PendingToolExecution,
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

function replaceMessage(
  messages: AgUiChatMessage[],
  index: number,
  message: AgUiChatMessage,
): AgUiChatMessage[] {
  const nextMessages = [...messages];
  nextMessages[index] = message;
  return nextMessages;
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

function appendErrorMessage(
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

function readMessages(
  item: ResourceStreamItem<AgUiChatMessage[]>,
): AgUiChatMessage[] {
  return 'value' in item ? item.value : [];
}
