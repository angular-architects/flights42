import {
  type AgentSubscriber,
  HttpAgent,
  type Message,
  randomUUID,
} from '@ag-ui/client';
import {
  resource,
  type ResourceStreamItem,
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
  parentMessageId?: string;
}

interface RunUntilSettledOptions {
  agent: HttpAgent;
  tools: AgUiClientToolDefinition[];
  toolMap: Map<string, AgUiClientToolDefinition>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  runId: string;
  model?: string;
  abortSignal: AbortSignal;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
  isLoading: WritableSignal<boolean>;
}

interface ExecutePendingToolsOptions {
  agent: HttpAgent;
  toolMap: Map<string, AgUiClientToolDefinition>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  pendingLocalCalls: PendingToolExecution[];
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface ExecuteToolOptions {
  agent: HttpAgent;
  tool: AgUiClientToolDefinition;
  componentMap: Map<string, AgUiRegisteredComponent>;
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
  tools: AgUiClientToolDefinition[];
  toolMap: Map<string, AgUiClientToolDefinition>;
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
  const threadId = randomUUID();
  const agent = new HttpAgent({ url: options.url, threadId });
  const tools = options.tools;
  const toolMap = new Map<string, AgUiClientToolDefinition>(
    tools.map((tool: AgUiClientToolDefinition) => [tool.name, tool]),
  );
  const componentMap = new Map<string, AgUiRegisteredComponent>(
    options.components.map((component: AgUiRegisteredComponent) => [
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

  return {
    ...chat,
    isLoading,
    sendMessage,
    resendMessages,
    stop: () => {
      agent.abortRun();
    },
  } satisfies AgUiChatResourceRef;
}

async function runUntilSettled(options: RunUntilSettledOptions): Promise<void> {
  const {
    agent,
    tools,
    toolMap,
    componentMap,
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
  const { agent, toolMap, componentMap, pendingLocalCalls, messageStream } =
    options;

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
  const { agent, tool, componentMap, pendingCall, messageStream } = options;

  const result = await tool.execute(pendingCall.toolCallArgs);
  const serializedResult = JSON.stringify(result ?? null);

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: serializedResult,
  });

  messageStream.update((item) => ({
    value: applyLocalToolResult(
      readMessages(item),
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
  const toolParents = new Map<string, string>();

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
        const parentMessageId = resolveParentMessageId(
          messages,
          event.parentMessageId,
          event.toolCallId,
        );
        toolParents.set(event.toolCallId, parentMessageId);

        return {
          value: upsertToolCall(messages, parentMessageId, {
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
      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: toolCallArgs,
          status: 'pending',
        }),
      }));

      if (!toolMap.has(toolCallName)) {
        return;
      }

      pendingLocalCalls.push({
        toolCallId: event.toolCallId,
        toolCallName,
        toolCallArgs,
        parentMessageId: toolParents.get(event.toolCallId),
      });
    },
    onToolCallResultEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: applyToolResult(
          readMessages(item),
          event.toolCallId,
          event.content,
          componentMap,
        ),
      }));
    },
    onRunErrorEvent: ({ event }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          event.message || 'Unknown AG-UI run error',
        ),
      }));

      console.error('AG-UI run error', event);
      console.error('AG-UI run error', messageStream());
    },
    onRunFailed: ({ error }) => {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          error instanceof Error ? error.message : 'Unknown AG-UI run failure',
        ),
      }));

      console.error('AG-UI run failed', error);
      console.error('AG-UI run failed', messageStream());
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

function resolveParentMessageId(
  messages: AgUiChatMessage[],
  parentMessageId: string | undefined,
  fallbackId: string,
): string {
  if (parentMessageId) {
    return parentMessageId;
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return lastAssistantMessage?.id ?? fallbackId;
}

function upsertToolCall(
  messages: AgUiChatMessage[],
  parentMessageId: string,
  toolCall: AgUiToolCall,
): AgUiChatMessage[] {
  const messagesWithParent = upsertAssistantMessage(
    messages,
    parentMessageId,
    '',
  );
  const parentIndex = messagesWithParent.findIndex(
    (message) => message.id === parentMessageId,
  );

  if (parentIndex === -1) {
    return messagesWithParent;
  }

  const parentMessage = messagesWithParent[parentIndex];
  if (parentMessage.role !== 'assistant') {
    return messagesWithParent;
  }

  const existingToolCallIndex = parentMessage.toolCalls.findIndex(
    (entry: AgUiToolCall) => entry.id === toolCall.id,
  );
  const nextToolCalls = [...parentMessage.toolCalls];

  if (existingToolCallIndex === -1) {
    nextToolCalls.push(toolCall);
  } else {
    nextToolCalls[existingToolCallIndex] = {
      ...nextToolCalls[existingToolCallIndex],
      ...toolCall,
    };
  }

  return replaceMessage(messagesWithParent, parentIndex, {
    ...parentMessage,
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

function applyToolResult(
  messages: AgUiChatMessage[],
  toolCallId: string,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const messagesWithStatus = updateToolCall(messages, toolCallId, {
    status: 'complete',
  });
  const widget = toWidget(
    toolNameFor(messagesWithStatus, toolCallId),
    content,
    componentMap,
  );

  if (!widget) {
    return messagesWithStatus;
  }

  return appendWidget(messagesWithStatus, toolCallId, widget);
}

function applyLocalToolResult(
  messages: AgUiChatMessage[],
  pendingCall: PendingToolExecution,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiChatMessage[] {
  const messagesWithStatus = updateToolCall(messages, pendingCall.toolCallId, {
    status: 'complete',
  });
  const widget = toWidget(pendingCall.toolCallName, content, componentMap);

  if (!widget) {
    return messagesWithStatus;
  }

  return appendWidget(
    messagesWithStatus,
    pendingCall.toolCallId,
    widget,
    pendingCall.parentMessageId,
  );
}

function appendWidget(
  messages: AgUiChatMessage[],
  toolCallId: string,
  widget: AgUiWidget,
  parentMessageId?: string,
): AgUiChatMessage[] {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }

    const matchesToolCall =
      message.toolCalls.some(
        (toolCall: AgUiToolCall) => toolCall.id === toolCallId,
      ) || message.id === parentMessageId;
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

function toWidget(
  name: string | undefined,
  content: string,
  componentMap: Map<string, AgUiRegisteredComponent>,
): AgUiWidget | null {
  const parsed = safeParseJson(content);

  if (name === 'showComponent') {
    return toRegisteredWidget(parsed, componentMap);
  }

  if (!name) {
    return null;
  }

  const component = componentMap.get(name)?.component;
  return parsed && typeof parsed === 'object' && component
    ? { name, component, props: parsed as Record<string, unknown> }
    : null;
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
