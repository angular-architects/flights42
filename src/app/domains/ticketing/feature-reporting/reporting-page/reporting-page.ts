import { JsonPipe } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  ElementRef,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';

import { createChartingRuntime } from '../ai/cart-runtime';
import { createChartResource } from '../ai/chart-resource';
import { CHART_COLORS } from '../chart/chart-colors';
import { DataItem } from '../chart/data-item';
import { examplePrompts } from './example-prompts';

@Component({
  selector: 'app-reporting-page',
  imports: [FormsModule, JsonPipe],
  templateUrl: './reporting-page.html',
  styleUrl: './reporting-page.css',
})
export class ReportingPage {
  private chart?: Chart;

  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chart');

  protected readonly data = signal<DataItem[]>([]);

  protected readonly showDetails = signal(false);
  protected readonly message = signal('');
  protected readonly input = signal<string | undefined>(undefined);

  protected readonly runtime = createChartingRuntime(this.data);
  protected readonly generator = createChartResource(this.runtime, this.input);

  constructor() {
    afterRenderEffect(() => {
      this.initChart();
    });

    afterRenderEffect(() => {
      const data = this.data();
      if (this.chart) {
        this.updateChart(data);
      }
    });
  }

  private updateChart(data: DataItem[]) {
    if (!this.chart) {
      return;
    }
    this.chart.data.labels = data.map((item) => item.name);
    this.chart.data.datasets[0].data = data.map((item) => item.value);
    this.chart.update();
  }

  private initChart() {
    const ctx = this.canvas();

    if (!ctx) {
      return;
    }

    this.chart = new Chart(ctx.nativeElement, {
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
        labels: [],
        datasets: [
          {
            backgroundColor: CHART_COLORS,
            data: [],
          },
        ],
      },
    });

    untracked(() => {
      const data = this.data();
      this.updateChart(data);
    });
  }

  protected submit(): void {
    this.input.set(this.message());
  }

  protected format(value: number) {
    return Number.isInteger(value) ? value.toString() : '';
  }

  protected toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  protected regenerate(): void {
    this.generator.reload();
  }

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    this.message.set(prompt);
    this.submit();
  }
}
