import { JsonPipe } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';

import { createChartResource } from '../ai/chart-resource';
import { createChartingRuntime } from '../ai/chart-runtime';
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
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chart');

  protected readonly data = signal<DataItem[]>([]);

  protected readonly showDetails = signal(false);
  protected readonly message = signal('');
  protected readonly input = signal<string | undefined>(undefined);

  protected readonly runtime = createChartingRuntime(this.data);
  protected readonly generator = createChartResource(this.runtime, this.input);

  constructor() {
    afterRenderEffect(() => {
      const data = this.data();
      const canvasElm = this.canvas();
      const canvas = canvasElm?.nativeElement;

      if (canvas) {
        this.renderChart(data, canvas);
      }
    });
  }

  private renderChart(data: DataItem[], canvas: HTMLCanvasElement) {
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
