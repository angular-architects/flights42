import { HttpAgent, type HttpAgentConfig } from '@ag-ui/client';
import { type Context, type RunAgentInput } from '@ag-ui/core';

export interface AppHttpAgentOptions {
  forwardedProps?: () => Record<string, unknown>;
  context?: () => readonly Context[];
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
