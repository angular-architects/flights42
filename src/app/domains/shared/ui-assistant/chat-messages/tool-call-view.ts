import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CopilotKit, type Message, RenderToolCalls } from '@copilotkit/angular';

type AssistantMessage = Extract<Message, { role: 'assistant' }>;
type ToolCall = NonNullable<AssistantMessage['toolCalls']>[number];

interface RendererConfigLike {
  name: string;
  agentId?: string;
  component?: unknown;
}

/**
 * Renders a single tool call. If a renderer component is registered for the tool
 * (a widget frontend tool, a render-tool-call, or a human-in-the-loop tool), it
 * renders through CopilotKit. Otherwise it shows a compact "Tool Call: <name>"
 * label that expands to the call's JSON arguments on click.
 */
@Component({
  selector: 'app-tool-call-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RenderToolCalls],
  template: `
    @if (hasRenderer()) {
      <copilot-render-tool-calls
        [message]="singleCallMessage()"
        [messages]="messages()"
        [isLoading]="isLoading()"
        [agentId]="agentId()" />
    } @else {
      <button type="button" class="tool-call" (click)="toggle()">
        <span class="tool-call-label"
          >Tool Call: {{ toolCall().function.name }}</span
        >
        <span class="tool-call-caret">{{ expanded() ? '▾' : '▸' }}</span>
      </button>
      @if (expanded()) {
        <pre class="tool-call-args">{{ prettyArgs() }}</pre>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .tool-call {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      color: inherit;
      font: inherit;
      font-size: calc(var(--font-size-sm) - 1pt);
      line-height: 1.2;
    }

    .tool-call-caret {
      font-size: 0.75em;
    }

    .tool-call-args {
      margin: 6px 0 0;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.04);
      border-radius: 6px;
      font-size: calc(var(--font-size-sm) - 1pt);
      overflow-x: auto;
      white-space: pre;
    }
  `,
})
export class ToolCallView {
  readonly toolCall = input.required<ToolCall>();
  readonly message = input.required<AssistantMessage>();
  readonly messages = input.required<Message[]>();
  readonly agentId = input.required<string>();
  readonly isLoading = input<boolean>(false);

  private readonly copilotKit = inject(CopilotKit);
  protected readonly expanded = signal(false);

  protected readonly hasRenderer = computed(() => {
    const name = this.toolCall().function.name;
    const agentId = this.agentId();
    const matches = (candidate: RendererConfigLike): boolean =>
      candidate.name === name &&
      (candidate.agentId === undefined || candidate.agentId === agentId) &&
      !!candidate.component;

    const renderers = this.copilotKit.toolCallRenderConfigs();
    return (
      renderers.some(matches) ||
      this.copilotKit.clientToolCallRenderConfigs().some(matches) ||
      this.copilotKit.humanInTheLoopToolRenderConfigs().some(matches) ||
      // Mirror pickRenderer's final "*" wildcard fallback (renderers only).
      renderers.some(
        (candidate) => candidate.name === '*' && !!candidate.component,
      )
    );
  });

  // A message carrying only this one tool call, so RenderToolCalls renders just
  // it (one bubble per call).
  protected readonly singleCallMessage = computed<AssistantMessage>(() => ({
    ...this.message(),
    toolCalls: [this.toolCall()],
  }));

  protected readonly prettyArgs = computed(() =>
    formatArgs(this.toolCall().function.arguments),
  );

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}

function formatArgs(args: string): string {
  if (!args) {
    return '{}';
  }
  try {
    return JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    return args;
  }
}
