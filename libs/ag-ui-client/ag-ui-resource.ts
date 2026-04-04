import { HttpAgent, randomUUID } from '@ag-ui/client';
import {
  EnvironmentInjector,
  inject,
  linkedSignal,
  resource,
  type ResourceStreamItem,
  signal,
  type WritableSignal,
} from '@angular/core';

import {
  type AgUiChatMessage,
  type AgUiChatMessageAttachment,
  type AgUiChatResourceRef,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
  type AgUiResourceOptions,
  type UserMessageContent,
  type UserMessageContentPart,
} from './ag-ui-types';
import { runUntilSettled } from './ag-ui-utils/agents';
import {
  appendErrorMessage,
  filterPublicMessages,
  friendlyErrorMessage,
  readMessages,
} from './ag-ui-utils/messages';
import { type PendingRun } from './ag-ui-utils/tools';
import { readRegisteredComponents } from './ag-ui-utils/widgets';

interface StreamOptions {
  params: PendingRun | undefined;
  abortSignal: AbortSignal;
}

interface SendMessageOptions {
  role: 'user';
  content: UserMessageContent;
}

interface NormalizedUserMessageContent {
  /**
   * Forwarded to `HttpAgent.addMessage` unchanged. Either the original
   * string or the structured array of `UserMessageContentPart`s.
   */
  agentContent: UserMessageContent;
  /**
   * Plain-text placeholder used for the locally-rendered chat bubble.
   * For string input this is the trimmed string; for array input we
   * concatenate text parts and append a German label per non-text part
   * (e.g. "[Bild hochgeladen]") so the renderer can show a meaningful
   * preview while the structured payload still travels to the agent.
   */
  displayContent: string;
  attachments: AgUiChatMessageAttachment[];
}

const ATTACHMENT_LABELS: Record<
  Exclude<UserMessageContentPart['type'], 'text'>,
  string
> = {
  image: '[Bild hochgeladen]',
  audio: '[Audio hochgeladen]',
  video: '[Video hochgeladen]',
  document: '[Dokument hochgeladen]',
  binary: '[Datei hochgeladen]',
};

function normalizeUserMessageContent(
  content: UserMessageContent,
): NormalizedUserMessageContent | null {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) {
      return null;
    }
    return {
      agentContent: content,
      displayContent: trimmed,
      attachments: [],
    };
  }

  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }

  const textPieces: string[] = [];
  const attachments: AgUiChatMessageAttachment[] = [];
  const placeholderPieces: string[] = [];

  for (const part of content) {
    if (part.type === 'text') {
      const trimmed = part.text.trim();
      if (trimmed) {
        textPieces.push(trimmed);
      }
      continue;
    }

    const placeholder = ATTACHMENT_LABELS[part.type];
    placeholderPieces.push(placeholder);
    attachments.push({
      type: part.type,
      mimeType:
        'source' in part && part.source ? part.source.mimeType : undefined,
    });
  }

  const displayContent = [...textPieces, ...placeholderPieces].join(' ').trim();

  if (!displayContent && attachments.length === 0) {
    return null;
  }

  return {
    agentContent: content,
    displayContent,
    attachments,
  };
}

export function agUiResource(
  options: AgUiResourceOptions,
): AgUiChatResourceRef {
  const hideInternal = options.hideInternal ?? true;
  const useServerMemory = options.useServerMemory ?? false;
  const maxLocalTurns = options.maxLocalTurns ?? 10;
  const environmentInjector = inject(EnvironmentInjector);
  const createAgent = (): HttpAgent =>
    new HttpAgent({ url: options.url, threadId: randomUUID() });
  let agent = createAgent();
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
  let activeRunRequestId: string | null = null;

  const stream = async (streamOptions: StreamOptions) => {
    const { params, abortSignal } = streamOptions;

    if (!params) {
      return messageStream.asReadonly();
    }

    isLoading.set(true);
    const runRequestId = params.id;
    activeRunRequestId = runRequestId;

    abortSignal.addEventListener('abort', () => {
      agent.abortRun();
    });

    void runUntilSettled({
      agent,
      tools,
      toolMap,
      componentMap,
      environmentInjector,
      runId: params.id,
      model: options.model,
      useServerMemory,
      forwardedProps: options.forwardedProps,
      abortSignal,
      messageStream,
      isLoading,
      maxLocalTurns,
    })
      .catch((error: unknown) => {
        if (abortSignal.aborted || activeRunRequestId !== runRequestId) {
          return;
        }

        messageStream.update((item) => ({
          value: appendErrorMessage(
            readMessages(item),
            friendlyErrorMessage(error, 'Unknown AG-UI error'),
          ),
        }));
      })
      .finally(() => {
        if (activeRunRequestId === runRequestId) {
          isLoading.set(false);
        }
      });

    return messageStream.asReadonly();
  };

  const sendMessage = (message: SendMessageOptions): void => {
    const normalized = normalizeUserMessageContent(message.content);

    if (!normalized) {
      return;
    }

    if (isLoading()) {
      agent.abortRun();
    }

    const id = randomUUID();

    if (useServerMemory) {
      agent.messages = [];
    }

    // The structured `agentContent` (string | UserMessageContentPart[])
    // travels to the agent untouched; only the local chat bubble uses
    // the textual placeholder.
    agent.addMessage({
      id,
      role: 'user' as const,
      content: normalized.agentContent,
    });

    messageStream.update((item) => ({
      value: [
        ...readMessages(item),
        {
          id,
          role: 'user' as const,
          content: normalized.displayContent,
          widgets: [],
          toolCalls: [],
          workflowSteps: [],
          attachments: normalized.attachments,
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

  const reset = (): void => {
    agent.abortRun();
    agent = createAgent();
    isLoading.set(false);
    pendingRun.set(undefined);
    messageStream.set({ value: [] });
  };

  const dispose = (): void => {
    agent.abortRun();
    reset();
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
    reset,
    dispose,
    stop: () => {
      agent.abortRun();
      isLoading.set(false);
    },
  };
}

function filterPublicMessages(messages: AgUiChatMessage[]): AgUiChatMessage[] {
  return messages.flatMap((message) => {
    if (isHiddenInternalMessage(message)) {
      return [];
    }

    const filteredToolCalls = message.toolCalls.filter(
      (toolCall) =>
        toolCall.name !== 'showComponent' && toolCall.name !== 'showComponents',
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

function isHiddenInternalMessage(message: AgUiChatMessage): boolean {
  if (message.role !== 'user') {
    return false;
  }

  const parsed = safeParseJson(message.content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const payload = parsed as Record<string, unknown>;
  return payload['type'] === 'a2ui_form_response';
}

async function runUntilSettled(options: RunUntilSettledOptions): Promise<void> {
  const {
    agent,
    tools,
    toolMap,
    environmentInjector,
    processor,
    runId,
    model,
    abortSignal,
    messageStream,
    maxLocalTurns,
  } = options;

  let done = false;
  let currentRunId = runId;
  let turnCount = 0;
  while (!done && !abortSignal.aborted) {
    if (turnCount >= maxLocalTurns) {
      messageStream.update((item) => ({
        value: appendErrorMessage(
          readMessages(item),
          `Local tool turn limit (${maxLocalTurns}) reached.`,
        ),
      }));
      break;
    }

    turnCount += 1;

    const pendingLocalCalls = await runAgent({
      agent,
      tools,
      toolMap,
      processor,
      runId: currentRunId,
      model,
      messageStream,
    });

    const executedAnyTool = await executePendingTools({
      agent,
      toolMap,
      environmentInjector,
      pendingLocalCalls,
      messageStream,
    });

    done = !executedAnyTool;
    currentRunId = randomUUID();
  }
}

async function executePendingTools(
  options: ExecutePendingToolsOptions,
): Promise<boolean> {
  const {
    agent,
    toolMap,
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
  const { agent, tool, environmentInjector, pendingCall, messageStream } =
    options;

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
    value: completeToolCall(readMessages(item), pendingCall.toolCallId),
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
  const { agent, tools, toolMap, processor, model, messageStream } = options;
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
      const isLocalTool = toolMap.has(toolCallName);

      messageStream.update((item) => ({
        value: updateToolCall(readMessages(item), event.toolCallId, {
          name: toolCallName,
          args: normalizedToolCallArgs,
          status: isLocalTool ? 'pending' : 'complete',
        }),
      }));

      if (!isLocalTool) {
        return;
      }

      pendingLocalCalls.push({
        toolCallId: event.toolCallId,
        toolCallName,
        toolCallArgs: normalizedToolCallArgs,
      });
    },
    onToolCallResultEvent: ({ event }) => {
      const parsed = safeParseJson(event.content);
      const widget = toA2UIWidget(parsed, event.toolCallId, processor);
      if (widget) {
        messageStream.update((item) => ({
          value: appendWidget(
            completeToolCall(readMessages(item), event.toolCallId),
            event.toolCallId,
            widget,
          ),
        }));
        return;
      }

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
      (entry: AgUiWidget) => entry.name === widget.name,
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

function replaceMessage(
  messages: AgUiChatMessage[],
  index: number,
  message: AgUiChatMessage,
): AgUiChatMessage[] {
  const nextMessages = [...messages];
  nextMessages[index] = message;
  return nextMessages;
}

function toA2UIWidget(
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

