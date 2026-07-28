import { HttpAgent, type HttpAgentConfig } from '@ag-ui/client';
import { type Message, type RunAgentInput } from '@ag-ui/core';

export interface AppHttpAgentOptions {
  forwardedProps?: () => Record<string, unknown>;
  state?: () => unknown;
  useServerMemory?: boolean;
}

const SERVER_RESUMED_INTERRUPT_REASONS = new Set([
  'human_approval',
  'tool_suspended',
]);

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

  /**
   * CopilotKit's `injectInterrupt` synthesizes a client-side tool result for
   * every interrupt that carries a `toolCallId`. That fits its own
   * executor-less "interrupt tools" (BuiltInAgent: `interrupt.id ===
   * toolCallId`, reason `"tool_call"`, the human response IS the result) but
   * not this bridge: per the AG-UI spec, Mastra's resumeStream emits the
   * authoritative TOOL_CALL_RESULT against the original toolCallId on the
   * resume run. The synthetic message would shadow that real result in
   * `RenderToolCalls` (first match wins), so it is dropped for the interrupt
   * reasons our server emits. Upstream issue: CopilotKit/CopilotKit#TODO —
   * remove this override once the synthesis is gated there.
   */
  override addMessage(message: Message): void {
    if (
      message.role === 'tool' &&
      (this.pendingInterrupts ?? []).some(
        (interrupt) =>
          interrupt.toolCallId === message.toolCallId &&
          SERVER_RESUMED_INTERRUPT_REASONS.has(interrupt.reason),
      )
    ) {
      return;
    }
    super.addMessage(message);
  }

  protected override requestInit(input: RunAgentInput): RequestInit {
    let messages = input.messages;
    const proxiedMcpRequest =
      input.forwardedProps?.['__proxiedMCPRequest'] !== undefined;
    if (this.options.useServerMemory && !proxiedMcpRequest) {
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
