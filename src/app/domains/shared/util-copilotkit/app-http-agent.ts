import { HttpAgent, type HttpAgentConfig } from '@ag-ui/client';
import { type Context, type Message, type RunAgentInput } from '@ag-ui/core';

export interface AppHttpAgentOptions {
  forwardedProps?: () => Record<string, unknown>;
  context?: () => readonly Context[];
  state?: () => unknown;
  useServerMemory?: boolean;
}

export class AppHttpAgent extends HttpAgent {
  private readonly sentMessageIds = new Set<string>();

  constructor(
    config: HttpAgentConfig,
    private readonly options: AppHttpAgentOptions = {},
  ) {
    super(config);
    if (options.useServerMemory) {
      this.subscribe({
        onRunFinalized: () => this.markAllSent(),
      });
    }
  }

  override addMessage(message: Message): void {
    if (
      message.role === 'tool' &&
      (this.pendingInterrupts ?? []).some(
        (interrupt) => interrupt.toolCallId === message.toolCallId,
      )
    ) {
      return;
    }
    super.addMessage(message);
  }

  protected override requestInit(input: RunAgentInput): RequestInit {
    let messages = input.messages;
    if (this.options.useServerMemory) {
      messages = messages.filter(
        (message) => !this.sentMessageIds.has(message.id),
      );
      this.markAllSent(input.messages);
    }
    const forwardedProps = {
      ...(this.options.forwardedProps?.() ?? {}),
      ...input.forwardedProps,
    };
    const context = mergePersistentContext(
      this.options.context?.() ?? [],
      input.context,
    );
    const state = this.options.state ? this.options.state() : input.state;
    return super.requestInit({
      ...input,
      messages,
      forwardedProps,
      context,
      state,
    });
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
