import {
  HttpAgent,
  type Interrupt,
  type Message,
  randomUUID,
  type ResumeEntry,
  type UserMessage,
} from '@ag-ui/client';
import {
  computed,
  inject,
  InjectionToken,
  Injector,
  runInInjectionContext,
  type Signal,
  signal,
} from '@angular/core';
import {
  CopilotKit,
  injectAgentStore,
  registerFrontendTool,
  registerHumanInTheLoop,
  registerRenderToolCall,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

import {
  type FrontendToolDefinition,
  type HumanInTheLoopDefinition,
  type RenderToolCallDefinition,
} from './tool-definition';

export interface CopilotAgentStore {
  messages: Signal<Message[]>;
  allMessages: Signal<Message[]>;
  pendingInterrupts: Signal<Interrupt[]>;
  isRunning: Signal<boolean>;
  state: Signal<unknown>;

  sendMessage(content: string, options?: SendMessageOptions): Promise<void>;
  sendMessage(
    content: UserMessage['content'],
    options?: SendMessageOptions,
  ): Promise<void>;
  sendMessage(
    message: Pick<UserMessage, 'content'> & Partial<Pick<UserMessage, 'id'>>,
    options?: SendMessageOptions,
  ): Promise<void>;

  resumeInterrupt(payload?: unknown): Promise<void>;
  stop(): void;
  reset(): void;
}

export interface SendMessageOptions {
  hidden?: boolean;
}

export interface AgentStoreConfig<
  FrontendArgs extends Record<string, unknown> = Record<string, unknown>,
  RenderToolCallArgs extends Record<string, unknown> = Record<string, unknown>,
  HumanInTheLoopArgs extends Record<string, unknown> = Record<string, unknown>,
> {
  agentId: string;
  url: string | (() => string);
  providedIn?: 'root' | 'platform' | 'any' | null;
  frontendTools?: readonly FrontendToolDefinition<FrontendArgs>[];
  renderToolCalls?: readonly RenderToolCallDefinition<RenderToolCallArgs>[];
  humanInTheLoop?: readonly HumanInTheLoopDefinition<HumanInTheLoopArgs>[];
  renderActivityMessages?: readonly RenderActivityMessageConfig[];
  forwardedProps?: () => Record<string, unknown>;
  useServerMemory?: boolean;
}

interface ResolvedAgentStoreConfig<
  FrontendArgs extends Record<string, unknown>,
  RenderToolCallArgs extends Record<string, unknown>,
  HumanInTheLoopArgs extends Record<string, unknown>,
> extends Omit<
  AgentStoreConfig<FrontendArgs, RenderToolCallArgs, HumanInTheLoopArgs>,
  'url'
> {
  url: string;
}

type SendMessageInput =
  | string
  | UserMessage['content']
  | (Pick<UserMessage, 'content'> & Partial<Pick<UserMessage, 'id'>>);

export function agentStore<
  FrontendArgs extends Record<string, unknown> = Record<string, unknown>,
  RenderToolCallArgs extends Record<string, unknown> = Record<string, unknown>,
  HumanInTheLoopArgs extends Record<string, unknown> = Record<string, unknown>,
>(
  config: AgentStoreConfig<
    FrontendArgs,
    RenderToolCallArgs,
    HumanInTheLoopArgs
  >,
): InjectionToken<CopilotAgentStore> {
  return new InjectionToken<CopilotAgentStore>(`${config.agentId} AgentStore`, {
    providedIn: config.providedIn === undefined ? 'root' : config.providedIn,
    factory: () =>
      createAgentStore({
        ...config,
        url: typeof config.url === 'function' ? config.url() : config.url,
      }),
  });
}

function createAgentStore<
  FrontendArgs extends Record<string, unknown>,
  RenderToolCallArgs extends Record<string, unknown>,
  HumanInTheLoopArgs extends Record<string, unknown>,
>(
  config: ResolvedAgentStoreConfig<
    FrontendArgs,
    RenderToolCallArgs,
    HumanInTheLoopArgs
  >,
): CopilotAgentStore {
  const copilotKit = inject(CopilotKit);
  const injector = inject(Injector);
  const forwardedProps = () =>
    config.forwardedProps
      ? runInInjectionContext(injector, config.forwardedProps)
      : undefined;

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [config.agentId]: new HttpAgent({
        agentId: config.agentId,
        url: config.url,
      }),
    },
  });

  for (const tool of config.frontendTools ?? []) {
    registerFrontendTool({ ...tool, agentId: config.agentId });
  }

  for (const toolCall of config.renderToolCalls ?? []) {
    registerRenderToolCall({ ...toolCall, agentId: config.agentId });
  }

  for (const tool of config.humanInTheLoop ?? []) {
    registerHumanInTheLoop({ ...tool, agentId: config.agentId });
  }

  for (const activityRenderer of config.renderActivityMessages ?? []) {
    copilotKit.addRenderActivityMessage({
      ...activityRenderer,
      agentId: config.agentId,
    });
  }

  const nativeStore = injectAgentStore(config.agentId);
  const hiddenMessageIds = signal(new Set<string>());
  const allMessages = computed(() => nativeStore().messages());
  const pendingInterrupts = computed(
    () => nativeStore().agent.pendingInterrupts,
  );

  return {
    allMessages,
    messages: computed(() =>
      allMessages().filter((message) => !hiddenMessageIds().has(message.id)),
    ),
    pendingInterrupts,
    isRunning: computed(() => nativeStore().isRunning()),
    state: computed(() => nativeStore().state()),
    sendMessage: async (input, options) => {
      const message = normalizeUserMessage(input);

      if (!message) {
        return;
      }

      const agent = nativeStore().agent;
      const previousMessages = [...agent.messages];

      if (options?.hidden) {
        hiddenMessageIds.update((current) => new Set(current).add(message.id));
      }

      if (config.useServerMemory) {
        agent.setMessages([]);
      }

      agent.addMessage(message);

      const runResult = await copilotKit.core.runAgent({
        agent,
        forwardedProps: forwardedProps(),
      });

      if (config.useServerMemory) {
        agent.setMessages([
          ...previousMessages,
          message,
          ...runResult.newMessages.filter(
            (newMessage) => newMessage.id !== message.id,
          ),
        ]);
      }
    },
    resumeInterrupt: async (payload) => {
      const agent = nativeStore().agent;
      const resume = buildResumeArray(agent.pendingInterrupts, payload);

      if (resume.length === 0) {
        return;
      }

      await copilotKit.core.runAgent({
        agent,
        forwardedProps: forwardedProps(),
        resume,
      });
    },
    stop: () => {
      nativeStore().agent.abortRun();
    },
    reset: () => {
      const agent = nativeStore().agent;
      agent.abortRun();
      agent.setMessages([]);
      agent.setState({});
      hiddenMessageIds.set(new Set());
    },
  };
}

function buildResumeArray(
  interrupts: readonly Interrupt[],
  payload: unknown,
): ResumeEntry[] {
  return interrupts.map((interrupt) => ({
    interruptId: interrupt.id,
    status: 'resolved',
    payload,
  }));
}

function normalizeUserMessage(input: SendMessageInput): UserMessage | null {
  const inputMessage =
    typeof input === 'object' && !Array.isArray(input) && 'content' in input
      ? input
      : { content: input };

  if (typeof inputMessage.content === 'string') {
    const content = inputMessage.content.trim();

    if (!content) {
      return null;
    }

    return {
      id: inputMessage.id ?? randomUUID(),
      role: 'user',
      content,
    };
  }

  if (
    !Array.isArray(inputMessage.content) ||
    inputMessage.content.length === 0
  ) {
    return null;
  }

  return {
    id: inputMessage.id ?? randomUUID(),
    role: 'user',
    content: inputMessage.content,
  };
}
