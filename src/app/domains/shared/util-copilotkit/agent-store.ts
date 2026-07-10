import {
  buildResumeArray,
  HttpAgent,
  type HttpAgentConfig,
  randomUUID,
} from '@ag-ui/client';
import {
  type Interrupt,
  type RunAgentInput,
  type UserMessage,
} from '@ag-ui/core';
import {
  computed,
  EnvironmentInjector,
  inject,
  InjectionToken,
  runInInjectionContext,
  type Signal,
  signal,
} from '@angular/core';
import {
  CopilotKit,
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  injectAgentStore,
  type Message,
  registerFrontendTool,
  registerHumanInTheLoop,
  registerRenderToolCall,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

import { type WithoutAgentId } from './tool-definition';

// Tool collections are heterogeneous (each tool has its own args type), so the
// element type erases the args to keep the array assignable. The concrete args
// types are preserved on each individual tool definition.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFrontendTool = WithoutAgentId<FrontendToolConfig<any>>;
type AnyRenderToolCall = WithoutAgentId<RenderToolCallConfig<any>>;
type AnyHumanInTheLoop = WithoutAgentId<HumanInTheLoopConfig<any>>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * `HttpAgent` variant for agents that keep conversation memory on the server.
 * `agent.messages` stays complete locally (so the UI shows the full history),
 * but each run only sends the messages the server has not processed yet; the
 * server reconstructs the rest from its thread memory. Trimming happens in the
 * request body only (`requestInit`), so local event application is untouched.
 *
 * CopilotKit drives self-managed agents through `run(...)`, not `runAgent(...)`,
 * so the "already sent" set is maintained where it is actually reached: in
 * `requestInit` (before each request) and via an `onRunFinalized` subscriber
 * (after each run, to also cover the messages the server generated).
 */
class ServerMemoryHttpAgent extends HttpAgent {
  private readonly sentMessageIds = new Set<string>();

  constructor(config: HttpAgentConfig) {
    super(config);
    this.subscribe({
      onRunFinalized: () => this.markAllSent(),
    });
  }

  protected override requestInit(input: RunAgentInput): RequestInit {
    const messages = input.messages.filter(
      (message) => !this.sentMessageIds.has(message.id),
    );
    // Everything currently local either goes out now or is already known to the
    // server, so mark it all — the next run must not resend earlier turns.
    this.markAllSent(input.messages);
    return super.requestInit({ ...input, messages });
  }

  private markAllSent(
    messages: readonly { id: string }[] = this.messages,
  ): void {
    for (const message of messages) {
      this.sentMessageIds.add(message.id);
    }
  }

  clearSentHistory(): void {
    this.sentMessageIds.clear();
  }
}

export interface SendMessageOptions {
  /**
   * Hidden messages are still sent to the agent, but filtered out of the
   * `messages` stream so they never appear in the chat UI.
   */
  hidden?: boolean;
}

/**
 * Content shapes accepted by `sendMessage`. `role` is never part of the input:
 * the store always sends a user message.
 */
export type SendMessageInput =
  | string
  | UserMessage['content']
  | (Pick<UserMessage, 'content'> & Partial<Pick<UserMessage, 'id'>>);

/**
 * App-facing agent store. Exposes CopilotKit's headless AG-UI primitives as
 * flat signals and convenience methods, without leaking the native
 * `Signal<AgentStore>` shape.
 */
export interface CopilotAgentStore {
  /** Visible messages (hidden messages filtered out). */
  messages: Signal<Message[]>;
  /** Unfiltered message stream, including hidden messages. */
  allMessages: Signal<Message[]>;
  isRunning: Signal<boolean>;
  state: Signal<unknown>;
  /** Open AG-UI interrupts from the last run, awaiting a resume payload. */
  pendingInterrupts: Signal<Interrupt[]>;

  sendMessage(
    input: SendMessageInput,
    options?: SendMessageOptions,
  ): Promise<void>;

  /** Resolves every open interrupt with `payload` and resumes the run. */
  resumeInterrupt(payload: unknown): Promise<void>;
  stop(): void;
  reset(): void;
}

export interface AgentStoreConfig {
  agentId: string;
  /** String or factory. A factory is resolved inside the token factory, so it
   *  may use Angular `inject(...)`. */
  url: string | (() => string);
  /** Sent to the agent as `forwardedProps.modelHint`. String or factory. */
  model?: string | (() => string);
  frontendTools?: readonly AnyFrontendTool[];
  renderToolCalls?: readonly AnyRenderToolCall[];
  humanInTheLoop?: readonly AnyHumanInTheLoop[];
  /** Extra per-run forwarded props (e.g. `{ agentMode }`). Evaluated on every
   *  run so reactive values are read fresh. */
  forwardedProps?: () => Record<string, unknown>;
  /** Hidden text prepended to the first user message of a fresh session. */
  firstMessagePreamble?: () => string | undefined;
  /** For agents configured with server-side (thread) memory: the client keeps
   *  the full history locally for display but only sends the messages the server
   *  has not processed yet, letting the server memory supply the rest. Leave
   *  false (the default) for stateless agents that receive the full history. */
  useServerMemory?: boolean;
  /** Defaults to `'root'`. Pass `null` to opt out of `providedIn`. */
  providedIn?: 'root' | null;
}

interface ResolvedAgentStoreConfig extends Omit<
  AgentStoreConfig,
  'url' | 'model'
> {
  url: string;
  model?: string;
}

/**
 * Creates an `InjectionToken` for a use-case CopilotKit agent store. The token
 * factory registers a self-managed `HttpAgent` for the existing
 * `/ag-ui/:agentId` route, binds the agent id onto every tool definition, and
 * returns the flat app-facing store.
 */
export function agentStore(
  config: AgentStoreConfig,
): InjectionToken<CopilotAgentStore> {
  return new InjectionToken<CopilotAgentStore>(`${config.agentId} AgentStore`, {
    providedIn: config.providedIn === undefined ? 'root' : config.providedIn,
    factory: () =>
      createAgentStore({
        ...config,
        url: typeof config.url === 'function' ? config.url() : config.url,
        model:
          typeof config.model === 'function' ? config.model() : config.model,
      }),
  });
}

function createAgentStore(config: ResolvedAgentStoreConfig): CopilotAgentStore {
  const copilotKit = inject(CopilotKit);
  // Captured so the per-run `forwardedProps` / `firstMessagePreamble` factories
  // can use Angular `inject(...)` even though they run outside the token factory.
  const envInjector = inject(EnvironmentInjector);

  const agentConfig = {
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  };
  const httpAgent = config.useServerMemory
    ? new ServerMemoryHttpAgent(agentConfig)
    : new HttpAgent(agentConfig);

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [config.agentId]: httpAgent,
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

  const nativeStore = injectAgentStore(config.agentId);
  const hiddenMessageIds = signal(new Set<string>());
  // Stamp the agent id onto every message: `<copilot-render-tool-calls>` picks
  // the tool renderer by matching the registered `agentId` against
  // `message.agentId`, and the self-managed HttpAgent does not set it.
  const allMessages = computed<Message[]>(() =>
    nativeStore()
      .messages()
      .map(
        (message) =>
          ({ ...message, agentId: config.agentId }) as unknown as Message,
      ),
  );
  let firstMessagePending = true;

  const forwardedPropsFor = (): Record<string, unknown> => ({
    ...(config.model ? { modelHint: config.model } : {}),
    ...(config.forwardedProps
      ? runInInjectionContext(envInjector, () => config.forwardedProps!())
      : {}),
  });

  return {
    allMessages,
    messages: computed(() =>
      allMessages().filter((message) => !hiddenMessageIds().has(message.id)),
    ),
    isRunning: computed(() => nativeStore().isRunning()),
    state: computed(() => nativeStore().state()),
    pendingInterrupts: computed(() => {
      // Re-read the reactive run signals so pending interrupts refresh whenever
      // a run finishes; `agent.pendingInterrupts` is a plain field.
      nativeStore().isRunning();
      allMessages();
      return nativeStore().agent.pendingInterrupts ?? [];
    }),
    sendMessage: async (input, options) => {
      const message = normalizeUserMessage(input);

      if (!message) {
        return;
      }

      const agent = nativeStore().agent;

      let outgoing = message;
      if (firstMessagePending) {
        const preamble = config.firstMessagePreamble
          ? runInInjectionContext(envInjector, () =>
              config.firstMessagePreamble!(),
            )?.trim()
          : undefined;
        if (preamble) {
          outgoing = {
            ...message,
            content: prependText(message.content, preamble),
          };
        }
      }
      firstMessagePending = false;

      if (options?.hidden) {
        hiddenMessageIds.update((current) => new Set(current).add(outgoing.id));
      }

      agent.addMessage(outgoing);

      await copilotKit.core.runAgent({
        agent,
        forwardedProps: forwardedPropsFor(),
      });
    },
    resumeInterrupt: async (payload) => {
      const agent = nativeStore().agent;
      const interrupts = agent.pendingInterrupts ?? [];

      if (interrupts.length === 0) {
        return;
      }

      const responses = Object.fromEntries(
        interrupts.map((interrupt) => [
          interrupt.id,
          { status: 'resolved' as const, payload },
        ]),
      );

      await copilotKit.core.runAgent({
        agent,
        resume: buildResumeArray(interrupts, responses),
        forwardedProps: forwardedPropsFor(),
      });
    },
    stop: () => {
      nativeStore().agent.abortRun();
    },
    reset: () => {
      const agent = nativeStore().agent;
      agent.abortRun();
      agent.messages = [];
      agent.threadId = randomUUID();
      if (agent instanceof ServerMemoryHttpAgent) {
        agent.clearSentHistory();
      }
      hiddenMessageIds.set(new Set());
      firstMessagePending = true;
    },
  };
}

function normalizeUserMessage(input: SendMessageInput): UserMessage | null {
  if (typeof input === 'string') {
    return input.trim()
      ? { id: randomUUID(), role: 'user', content: input }
      : null;
  }

  if (Array.isArray(input)) {
    return input.length > 0
      ? { id: randomUUID(), role: 'user', content: input }
      : null;
  }

  const { content } = input;
  if (typeof content === 'string' && !content.trim()) {
    return null;
  }
  if (Array.isArray(content) && content.length === 0) {
    return null;
  }

  return { id: input.id ?? randomUUID(), role: 'user', content };
}

function prependText(
  content: UserMessage['content'],
  text: string,
): UserMessage['content'] {
  if (typeof content === 'string') {
    return `${text}\n\n${content}`;
  }

  return [{ type: 'text', text }, ...content];
}
