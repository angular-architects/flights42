import { A2uiRendererService } from '@a2ui/angular/v0_9';
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
  type AgUiResourceOptions,
  type UserMessageContent,
  type UserMessageContentPart,
} from './ag-ui-types';
import { runUntilSettled } from './ag-ui-utils/agents';
import {
  appendErrorMessage,
  filterPublicMessages,
  readMessages,
} from './ag-ui-utils/messages';
import { type PendingRun } from './ag-ui-utils/tools';

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
  const renderer = inject(A2uiRendererService);
  const createAgent = (): HttpAgent =>
    new HttpAgent({ url: options.url, threadId: randomUUID() });
  let agent = createAgent();
  const tools = options.tools;
  const toolMap = new Map<string, AgUiClientToolDefinition<never>>(
    tools.map((tool: AgUiClientToolDefinition<never>) => [tool.name, tool]),
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
      renderer,
      environmentInjector,
      runId: params.id,
      model: options.model,
      useServerMemory,
      a2uiCatalog: options.a2uiCatalog,
      abortSignal,
      messageStream,
      isLoading,
      maxLocalTurns,
      extraForwardedProps: readForwardedProps(),
    })
      .catch((error: unknown) => {
        if (abortSignal.aborted || activeRunRequestId !== runRequestId) {
          return;
        }

        messageStream.update((item) => ({
          value: appendErrorMessage(
            readMessages(item),
            error instanceof Error ? error.message : 'Unknown AG-UI error',
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
    },
  } satisfies AgUiChatResourceRef;
}
