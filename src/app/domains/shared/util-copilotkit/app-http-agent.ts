import { HttpAgent, type HttpAgentConfig } from '@ag-ui/client';
import { type Message, type RunAgentInput } from '@ag-ui/core';

export interface AppHttpAgentOptions {
  forwardedProps?: () => Record<string, unknown>;
  state?: () => unknown;
  useServerMemory?: boolean;
}

const SERVER_INTERRUPT_REASONS = new Set(['human_approval', 'tool_suspended']);

export class AppHttpAgent extends HttpAgent {
  private readonly sentMessageIds = new Set<string>();

  constructor(
    config: HttpAgentConfig,
    private readonly options: AppHttpAgentOptions = {},
  ) {
    super(config);
    if (options.useServerMemory) {
      this.subscribe({
        onRunFinalized: ({ input }) => {
          if (!isProxiedMcpRequest(input)) {
            this.markAllSent();
          }
        },
      });
    }
  }

  override addMessage(message: Message): void {
    if (this.isInterruptToolResultEcho(message)) {
      return;
    }
    super.addMessage(message);
  }

  private isInterruptToolResultEcho(message: Message): boolean {
    if (message.role !== 'tool') {
      return false;
    }
    return (this.pendingInterrupts ?? []).some(
      (interrupt) =>
        interrupt.toolCallId === message.toolCallId &&
        SERVER_INTERRUPT_REASONS.has(interrupt.reason),
    );
  }

  protected override requestInit(input: RunAgentInput): RequestInit {
    let messages = input.messages;
    if (this.options.useServerMemory && !isProxiedMcpRequest(input)) {
      messages = messages.filter(
        (message) => !this.sentMessageIds.has(message.id),
      );
      this.markAllSent(input.messages);
    }
    const forwardedProps = {
      ...(this.options.forwardedProps?.() ?? {}),
      ...input.forwardedProps,
    };
    const state = this.options.state ? this.options.state() : input.state;
    return super.requestInit({
      ...input,
      messages,
      forwardedProps,
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

function isProxiedMcpRequest(input: RunAgentInput): boolean {
  return Boolean(
    (input.forwardedProps as { __proxiedMCPRequest?: unknown } | undefined)
      ?.__proxiedMCPRequest,
  );
}
