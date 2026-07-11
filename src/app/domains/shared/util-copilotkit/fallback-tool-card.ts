import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createRenderToolCall } from './tool-definition';

const fallbackToolArgsSchema = z.record(z.string(), z.unknown());

export type FallbackToolArgs = z.infer<typeof fallbackToolArgsSchema>;

@Component({
  selector: 'app-fallback-tool-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="tool-call" (click)="toggle()">
      <span class="tool-call-label">Tool Call: {{ toolName() }}</span>
      <span class="tool-call-caret">{{ expanded() ? '▾' : '▸' }}</span>
    </button>
    @if (expanded()) {
      <pre class="tool-call-args">{{ prettyArgs() }}</pre>
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
export class FallbackToolCard implements ToolRenderer<FallbackToolArgs> {
  readonly toolCall = input.required<AngularToolCall<FallbackToolArgs>>();

  protected readonly expanded = signal(false);

  protected readonly toolName = computed(
    () => this.toolCall().name ?? 'unknown',
  );

  protected readonly prettyArgs = computed(() =>
    JSON.stringify(this.toolCall().args ?? {}, null, 2),
  );

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}

export const fallbackToolCard = createRenderToolCall({
  name: '*',
  args: fallbackToolArgsSchema,
  component: FallbackToolCard,
});
