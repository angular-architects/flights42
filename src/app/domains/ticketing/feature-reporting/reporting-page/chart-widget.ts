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
import {
  EXECUTE_JAVASCRIPT_TOOL_NAME,
  parseChart,
  sameChart,
} from './reporting-chart';

const executeJavaScriptArgsSchema = z.object({
  code: z.string().optional(),
  title: z.string().optional(),
  detail: z.enum(['minimal', 'full']).optional(),
});

type ExecuteJavaScriptArgs = z.infer<typeof executeJavaScriptArgsSchema>;

@Component({
  selector: 'app-chart-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let chartValue = chart();
    @if (chartValue) {
      <h2>{{ chartValue.title }}</h2>
      <div class="chart-wrapper">
        <canvas #canvas></canvas>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .chart-wrapper {
      margin-left: 1.5rem;
    }
  `,
})
export class ChartWidget implements ToolRenderer<ExecuteJavaScriptArgs> {
  readonly toolCall = input.required<AngularToolCall<ExecuteJavaScriptArgs>>();

  protected readonly chart = computed(
    () => parseChart(this.toolCall().result),
    { equal: sameChart },
  );

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    afterRenderEffect((onCleanup) => {
      const data = this.chart()?.data;
      const canvas = this.canvas()?.nativeElement;
      if (data && canvas) {
        const chart = renderChart(data, canvas);
        onCleanup(() => chart.destroy());
      }
    });
  }
}

function renderChart(data: DataItem[], canvas: HTMLCanvasElement): Chart {
  return new Chart(canvas, {
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
}

export const chartWidget = createRenderToolCall({
  name: EXECUTE_JAVASCRIPT_TOOL_NAME,
  args: executeJavaScriptArgsSchema,
  component: ChartWidget,
});
