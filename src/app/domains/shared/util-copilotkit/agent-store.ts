import {
  buildResumeArray,
  HttpAgent,
  type HttpAgentConfig,
  randomUUID,
} from '@ag-ui/client';
import {
  type Context,
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

  constructor(
    config: HttpAgentConfig,
    /** Persistent forwarded props (e.g. `agentMode`) re-attached to EVERY
     *  request. See `requestInit` for why. */
    private readonly persistentForwardedProps: () => Record<
      string,
      unknown
    > = () => ({}),
    /** Persistent AG-UI context entries (e.g. the A2UI custom catalog)
     *  re-attached to EVERY request, including CopilotKit's context-less
     *  follow-up runs — same reasoning as `persistentForwardedProps`. */
    private readonly persistentContext: () => readonly Context[] = () => [],
  ) {
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
    // CopilotKit's automatic follow-up runs (which feed frontend-tool results
    // back to the agent) call `runAgent({ agent })` without forwardedProps, so
    // they drop `agentMode`. Without it the server falls back to the default
    // agent and the plan/execution selection flips mid-turn. Re-attach the
    // persistent props on every request (explicit per-run props still win).
    const forwardedProps = {
      ...this.persistentForwardedProps(),
      ...input.forwardedProps,
    };
    // Same follow-up-run problem as forwardedProps: re-attach the persistent
    // AG-UI context so the server keeps seeing e.g. the custom catalog. Per-run
    // entries win over persistent ones sharing a description.
    const context = mergePersistentContext(
      this.persistentContext(),
      input.context,
    );
    return super.requestInit({ ...input, messages, forwardedProps, context });
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

/** Prepends persistent context entries, skipping any whose `description` a
 *  per-run entry already provides (per-run wins). */
function mergePersistentContext(
  persistent: readonly Context[],
  incoming: readonly Context[] = [],
): Context[] {
  const present = new Set(incoming.map((entry) => entry.description));
  return [
    ...persistent.filter((entry) => !present.has(entry.description)),
    ...incoming,
  ];
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
  /** Extra AG-UI context entries forwarded to the agent as `context` (e.g. the
   *  A2UI custom-catalog description the server injects into its system prompt).
   *  Evaluated in an injection context and re-attached to every request,
   *  including CopilotKit's follow-up runs. Only honored for `useServerMemory`
   *  agents (the ones whose request path re-attaches persistent context). */
  context?: () => readonly Context[];
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

  const forwardedPropsFor = (): Record<string, unknown> => ({
    ...(config.model ? { modelHint: config.model } : {}),
    ...(config.forwardedProps
      ? runInInjectionContext(envInjector, () => config.forwardedProps!())
      : {}),
  });

  const contextFor = (): readonly Context[] =>
    config.context
      ? runInInjectionContext(envInjector, () => config.context!())
      : [];

  const agentConfig = {
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  };
  const httpAgent = config.useServerMemory
    ? new ServerMemoryHttpAgent(agentConfig, forwardedPropsFor, contextFor)
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
