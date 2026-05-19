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

  protected readonly errorMessage = computed<string | null>(() =>
    getErrorMessage(this.chat.value()),
  );

  protected readonly assistantMessage = computed<string>(() =>
    getAssistantMessage(this.chat.value()),
  );

  protected readonly allToolCalls = computed<AgUiToolCall[]>(() =>
    getAllToolCalls(this.chat.value()),
  );

  protected readonly currentStatus = computed<string>(() =>
    getCurrentStatus(this.allToolCalls(), this.chat.isLoading()),
  );

  protected readonly showToolDetails = signal(false);

  protected readonly latestJavaScriptCode = computed<string | null>(() =>
    getLatestJavaScriptCode(this.allToolCalls()),
  );

  protected readonly showCodeDetails = signal(false);

  protected readonly hasChart = computed(() => this.chartData().length > 0);
  protected readonly formatToolArgs = formatToolArgs;
  protected readonly getJavaScriptCode = extractJavaScriptCodeFromToolCall;

  constructor() {
    afterRenderEffect(() => {
      const data = this.chartData();
      const canvasElm = this.canvas();
      const canvas = canvasElm?.nativeElement;

      if (canvas && data.length > 0) {
        renderChart(data, canvas);
      }
    });

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

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    if (!prompt) {
      return;
    }
    this.message.set(prompt);
    this.submit();
  }
}

function getErrorMessage(
  messages: readonly { role: string; content: string }[],
): string | null {
  const errorMessage = messages.find((message) => message.role === 'error');
  return errorMessage?.content ?? null;
}

function getAssistantMessage(
  messages: readonly { role: string; content: string }[],
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === 'assistant' && message.content.trim().length > 0) {
      return message.content;
    }
  }
  return '';
}

function getAllToolCalls(
  messages: readonly { role: string; toolCalls?: AgUiToolCall[] }[],
): AgUiToolCall[] {
  return messages.flatMap((message) =>
    message.role === 'assistant' ? (message.toolCalls ?? []) : [],
  );
}

function getCurrentStatus(
  toolCalls: readonly AgUiToolCall[],
  isLoading: boolean,
): string {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const toolCall = toolCalls[i];
    if (toolCall.status === 'pending' && toolCall.name) {
      return `Running tool: ${toolCall.name}`;
    }
  }
  return isLoading ? 'Thinking' : 'Ready';
}

function getLatestJavaScriptCode(
  toolCalls: readonly AgUiToolCall[],
): string | null {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const code = extractJavaScriptCodeFromToolCall(toolCalls[i]);
    if (code) {
      return code;
    }
  }
  return null;
}

function renderChart(data: DataItem[], canvas: HTMLCanvasElement): void {
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

function formatToolArgs(args: unknown): string {
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

function extractJavaScriptCodeFromToolCall(
  toolCall: AgUiToolCall,
): string | null {
  const args = coerceArgsObject(toolCall.args);
  if (!args) {
    return null;
  }
  const code = (args as { code?: unknown }).code;
  if (typeof code === 'string' && code.length > 0) {
    return code;
  }
  return null;
}

function coerceArgsObject(args: unknown): Record<string, unknown> | null {
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
