import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  agUiResource,
  type AgUiToolCall,
  defineAgUiTool,
} from '@internal/ag-ui-client';
import { Chart } from 'chart.js/auto';
import { z } from 'zod';

import { ConfigService } from '../../../shared/util-common/config-service';
import { CHART_COLORS } from '../chart/chart-colors';
import { DataItem } from '../chart/data-item';
import { examplePrompts } from './example-prompts';

const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() })),
});

@Component({
  selector: 'app-reporting-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './reporting-page.html',
  styleUrl: './reporting-page.css',
})
export class ReportingPage {
  private readonly config = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chart');

  protected readonly chartData = signal<DataItem[]>([]);
  protected readonly chartTitle = signal<string | null>(null);
  protected readonly message = signal('');

  private readonly renderChartTool = defineAgUiTool({
    name: 'renderChart',
    description:
      'Renders the supplied data as a bar chart in the user interface.',
    schema: renderChartSchema,
    execute: ({ title, data }) => {
      this.chartTitle.set(title);
      this.chartData.set(data);
      return { ok: true };
    },
  });

  protected readonly chat = agUiResource({
    url: this.config.agUiUrlFor('reportingAgent'),
    model: this.config.model,
    useServerMemory: false,
    tools: [this.renderChartTool],
  });

  protected readonly errorMessage = computed<string | null>(() => {
    const messages = this.chat.value();
    const errorMessage = messages.find((message) => message.role === 'error');
    return errorMessage?.content ?? null;
  });

  // Latest assistant text (used as the short confirmation underneath the
  // chart). The agent is instructed to reply with a single short sentence
  // after the tool calls.
  protected readonly assistantMessage = computed<string>(() => {
    const messages = this.chat.value();
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role === 'assistant' && message.content.trim().length > 0) {
        return message.content;
      }
    }
    return '';
  });

  // All tool calls produced since the current run started, in the order they
  // were invoked. Mirrors the dashboard's `allToolCalls` so the same
  // status-chip + tool-details rendering can be reused. `chat.reset()` (called
  // from `submit()`) clears the message stream, so a fresh run automatically
  // starts from an empty list.
  protected readonly allToolCalls = computed<AgUiToolCall[]>(() => {
    const messages = this.chat.value();
    return messages.flatMap((message) =>
      message.role === 'assistant' ? message.toolCalls : [],
    );
  });

  // While the agent is running, surface the most recent pending tool call so
  // the user knows which tool is currently executing. Falls back to
  // "Thinking" while loading and "Ready" once finished — same logic as the
  // dashboard so the chip looks identical across the app.
  protected readonly currentStatus = computed<string>(() => {
    const toolCalls = this.allToolCalls();
    for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
      const toolCall = toolCalls[i];
      if (toolCall.status === 'pending' && toolCall.name) {
        return `Running tool: ${toolCall.name}`;
      }
    }
    return this.chat.isLoading() ? 'Thinking' : 'Ready';
  });

  protected readonly showToolDetails = signal(false);

  // The most recent `executeJavaScript` snippet the agent ran on the
  // server. Used by the bottom "Details" button to render the generated
  // source code as a formatted block. `null` while the run is still
  // pending or no `executeJavaScript` call has happened yet.
  protected readonly latestJavaScriptCode = computed<string | null>(() => {
    const toolCalls = this.allToolCalls();
    for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
      const code = this.getJavaScriptCode(toolCalls[i]);
      if (code) {
        return code;
      }
    }
    return null;
  });

  protected readonly showCodeDetails = signal(false);

  protected readonly hasChart = computed(() => this.chartData().length > 0);

  constructor() {
    afterRenderEffect(() => {
      const data = this.chartData();
      const canvasElm = this.canvas();
      const canvas = canvasElm?.nativeElement;

      if (canvas && data.length > 0) {
        this.renderChart(data, canvas);
      }
    });

    // One-shot diagnostic so the dynamic "Details" button can be debugged
    // from the browser console: whenever the agent finishes a turn, log the
    // assembled tool-call list so we can see what `executeJavaScript`'s
    // args actually look like.
    effect(() => {
      if (this.chat.isLoading()) {
        return;
      }
      const calls = this.allToolCalls();
      if (calls.length > 0) {
        console.debug('[reporting] tool calls', calls);
      }
    });

    this.destroyRef.onDestroy(() => this.chat.dispose());
  }

  private renderChart(data: DataItem[], canvas: HTMLCanvasElement): void {
    const chart = new Chart(canvas, {
      type: 'bar',
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          },
        },
      },
      data: {
        labels: data.map((item) => item.name),
        datasets: [
          {
            backgroundColor: CHART_COLORS,
            data: data.map((item) => item.value),
          },
        ],
      },
    });
    chart.render();
  }

  protected submit(): void {
    const content = this.message().trim();
    if (!content) {
      return;
    }
    this.chartData.set([]);
    this.chartTitle.set(null);
    this.showToolDetails.set(false);
    this.showCodeDetails.set(false);
    this.chat.reset();
    this.chat.sendMessage({ role: 'user', content });
  }

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected toggleCodeDetails(): void {
    this.showCodeDetails.update((value) => !value);
  }

  protected formatToolArgs(args: unknown): string {
    if (args === undefined || args === null) {
      return '';
    }
    if (typeof args === 'string') {
      return args;
    }
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  }

  // The agent's JS-sandbox tool sends the actual snippet it ran on the
  // server inside `args.code`. We deliberately look it up by ARG SHAPE
  // (any object with a non-empty string `code`) rather than by tool name,
  // because Mastra/AG-UI may surface the tool either via its `id`
  // (`executeJavaScript`) or via its registration key
  // (`executeJavaScriptTool`) depending on the adapter version. The
  // shape-based check is also future-proof if the tool is ever renamed.
  protected getJavaScriptCode(toolCall: AgUiToolCall): string | null {
    const args = this.coerceArgsObject(toolCall.args);
    if (!args) {
      return null;
    }
    const code = (args as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) {
      return code;
    }
    return null;
  }

  private coerceArgsObject(args: unknown): Record<string, unknown> | null {
    if (args && typeof args === 'object') {
      return args as Record<string, unknown>;
    }
    if (typeof args === 'string' && args.trim().length > 0) {
      try {
        const parsed: unknown = JSON.parse(args);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    if (!prompt) {
      return;
    }
    this.message.set(prompt);
    this.submit();
  }
}
