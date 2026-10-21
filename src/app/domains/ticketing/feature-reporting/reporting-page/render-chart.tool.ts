import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { Chart } from 'chart.js/auto';
import { z } from 'zod';

import { createRenderToolCall } from '../../../shared/util-copilotkit/tool-definition';
import { CHART_COLORS } from '../chart/chart-colors';
import { DataItem } from '../chart/data-item';

const executeJavaScriptArgsSchema = z.object({
  code: z.string(),
  title: z.string(),
});

export type ExecuteJavaScriptArgs = z.infer<typeof executeJavaScriptArgsSchema>;

const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() })),
});

export type RenderChartResult = z.infer<typeof renderChartSchema>;

@Component({
  selector: 'app-render-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let chart = result();
    @if (chart) {
      <h2>{{ chart.title }}</h2>

      <div class="chart-wrapper">
        <canvas #canvas></canvas>
      </div>
    }
  `,
  styles: `
    .chart-wrapper {
      margin-left: 1.5rem;
    }
  `,
})
export class RenderChart implements ToolRenderer<ExecuteJavaScriptArgs> {
  readonly toolCall = input.required<AngularToolCall<ExecuteJavaScriptArgs>>();

  protected readonly canvas =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly rawResult = computed(() => this.toolCall().result);
  protected readonly result = computed(() => parseResult(this.rawResult()));

  constructor() {
    afterRenderEffect(() => {
      const data = this.result()?.data ?? [];
      const canvasElm = this.canvas();
      const canvas = canvasElm?.nativeElement;

      if (canvas && data.length > 0) {
        renderChart(data, canvas);
      }
    });
  }
}

export const renderChartToolCall = createRenderToolCall({
  name: 'executeJavaScript',
  args: executeJavaScriptArgsSchema,
  component: RenderChart,
});

function parseResult(result: string | undefined): RenderChartResult | null {
  if (!result) {
    return null;
  }
  try {
    const parsed = renderChartSchema.safeParse(JSON.parse(result));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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
