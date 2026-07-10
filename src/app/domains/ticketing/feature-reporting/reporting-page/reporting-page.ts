import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type Message } from '@copilotkit/angular';
import { Chart } from 'chart.js/auto';

import { CHART_COLORS } from '../chart/chart-colors';
import { DataItem } from '../chart/data-item';
import { examplePrompts } from './example-prompts';
import { ReportingAgentStore } from './reporting-agent-store';
import { ReportingChartStore } from './reporting-chart-store';

interface ReportingToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete';
}

@Component({
  selector: 'app-reporting-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './reporting-page.html',
  styleUrl: './reporting-page.css',
})
export class ReportingPage {
  protected readonly chat = inject(ReportingAgentStore);
  private readonly chartStore = inject(ReportingChartStore);

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chart');

  protected readonly chartData = this.chartStore.data;
  protected readonly chartTitle = this.chartStore.title;
  protected readonly message = signal('');

  protected readonly assistantMessage = computed<string>(() =>
    getAssistantMessage(this.chat.messages()),
  );

  protected readonly allToolCalls = computed<ReportingToolCall[]>(() =>
    collectToolCalls(this.chat.messages()),
  );

  protected readonly currentStatus = computed<string>(() =>
    getCurrentStatus(this.allToolCalls(), this.chat.isRunning()),
  );

  protected readonly errorMessage = computed<string | null>(() => null);

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
  }

  protected submit(): void {
    const content = this.message().trim();
    if (!content) {
      return;
    }
    this.chartStore.clear();
    this.showToolDetails.set(false);
    this.showCodeDetails.set(false);
    this.chat.reset();
    void this.chat.sendMessage(content);
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

function getAssistantMessage(messages: readonly Message[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      message.role === 'assistant' &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0
    ) {
      return message.content;
    }
  }
  return '';
}

function collectToolCalls(messages: readonly Message[]): ReportingToolCall[] {
  const resolved = new Set<string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      resolved.add(message.toolCallId);
    }
  }

  const calls: ReportingToolCall[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.toolCalls) {
      continue;
    }
    for (const toolCall of message.toolCalls) {
      calls.push({
        id: toolCall.id,
        name: toolCall.function.name,
        args: parseToolArguments(toolCall.function.arguments),
        status: resolved.has(toolCall.id) ? 'complete' : 'pending',
      });
    }
  }
  return calls;
}

function getCurrentStatus(
  toolCalls: readonly ReportingToolCall[],
  isRunning: boolean,
): string {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const toolCall = toolCalls[i];
    if (toolCall.status === 'pending' && toolCall.name) {
      return `Running tool: ${toolCall.name}`;
    }
  }
  return isRunning ? 'Thinking' : 'Ready';
}

function getLatestJavaScriptCode(
  toolCalls: readonly ReportingToolCall[],
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
  toolCall: ReportingToolCall,
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

function parseToolArguments(args: string): unknown {
  try {
    return JSON.parse(args);
  } catch {
    return args;
  }
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
