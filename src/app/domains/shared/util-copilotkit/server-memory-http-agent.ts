import { HttpAgent, type HttpAgentConfig } from '@ag-ui/client';
import { type Context, type RunAgentInput } from '@ag-ui/core';

export class ServerMemoryHttpAgent extends HttpAgent {
  private readonly sentMessageIds = new Set<string>();

  constructor(
    config: HttpAgentConfig,
    private readonly persistentForwardedProps: () => Record<
      string,
      unknown
    > = () => ({}),
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
    this.markAllSent(input.messages);
    const forwardedProps = {
      ...this.persistentForwardedProps(),
      ...input.forwardedProps,
    };
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
