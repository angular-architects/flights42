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
  type AgUiChatResourceRef,
  type AgUiClientToolDefinition,
  type AgUiResourceOptions,
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
  content: string;
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

    if (useServerMemory) {
      agent.messages = [];
    }

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
