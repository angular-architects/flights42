import type { AgentSubscriber, RunAgentInput } from '@ag-ui/client';
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
  type AgUiInterrupt,
  type AgUiResumeRequest,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
  type AgUiResourceOptions,
} from './ag-ui-types';
import { runUntilSettled } from './ag-ui-utils/agents';
import {
  appendErrorMessage,
  filterPublicMessages,
  readMessages,
} from './ag-ui-utils/messages';
import { type PendingRun } from './ag-ui-utils/tools';
import { readRegisteredComponents } from './ag-ui-utils/widgets';

interface StreamOptions {
  params: PendingRun | undefined;
  abortSignal: AbortSignal;
}

interface RunAgentCompatParameters extends Partial<
  Pick<RunAgentInput, 'runId' | 'tools' | 'context' | 'forwardedProps'>
> {
  abortController?: AbortController;
  resume?: AgUiResumeRequest;
}

class InterruptAwareHttpAgent extends HttpAgent {
  runAgentCompat(
    parameters?: RunAgentCompatParameters,
    subscriber?: AgentSubscriber,
  ) {
    return super.runAgent(parameters, subscriber);
  }

  protected override prepareRunAgentInput(
    parameters?: RunAgentCompatParameters,
  ): RunAgentInput {
    const input = super.prepareRunAgentInput(parameters);
    if (!parameters?.resume) {
      return input;
    }

    return {
      ...input,
      resume: parameters.resume,
    } as RunAgentInput;
  }
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
  const createAgent = (): InterruptAwareHttpAgent =>
    new InterruptAwareHttpAgent({ url: options.url, threadId: randomUUID() });
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
  const interrupt = signal<AgUiInterrupt | null>(null);
  const messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>> =
    signal({
      value: [],
    });

  const isLoading = signal<boolean>(false);

  let activeRunRequestId = '';

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

    runUntilSettled({
      agent,
      tools,
      toolMap,
      componentMap,
      environmentInjector,
      runId: params.id,
      resume: params.resume,
      model: options.model,
      useServerMemory,
      abortSignal,
      interrupt,
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
        isLoading.set(false);
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

    interrupt.set(null);

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

    interrupt.set(null);
    pendingRun.set({ id: randomUUID() });
  };

  const resumeInterrupt = (payload?: unknown): void => {
    const activeInterrupt = interrupt();
    if (!activeInterrupt) {
      return;
    }

    interrupt.set(null);
    pendingRun.set({
      id: randomUUID(),
      resume: {
        interruptId: activeInterrupt.id,
        payload,
      },
    });
  };

  const reset = (): void => {
    agent.abortRun();
    agent = createAgent();
    isLoading.set(false);
    interrupt.set(null);
    pendingRun.set(undefined);
    messageStream.set({ value: [] });
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
    interrupt: interrupt.asReadonly(),
    sendMessage,
    approveInterrupt: () => {
      resumeInterrupt({ approved: true });
    },
    rejectInterrupt: () => {
      resumeInterrupt({ approved: false });
    },
    resumeInterrupt,
    resendMessages,
    reset,
    stop: () => {
      agent.abortRun();
    },
  } satisfies AgUiChatResourceRef;
}
