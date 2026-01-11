import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataItem, NgxChartsModule } from '@swimlane/ngx-charts';

import { createChartingRuntime } from '../ai/cart-runtime';
import { createChartResource } from '../ai/chart-resource';
import { examplePrompts } from './example-prompts';

@Component({
  selector: 'app-reporting',
  imports: [NgxChartsModule, FormsModule, JsonPipe],
  templateUrl: './reporting.html',
  styleUrl: './reporting.css',
})
export class Reporting {
  protected readonly data = signal<DataItem[]>([]);

  protected readonly showDetails = signal(false);
  protected readonly message = signal('');
  protected readonly input = signal<string | undefined>(undefined);

  protected readonly runtime = createChartingRuntime(this.data);
  protected readonly generator = createChartResource(this.runtime, this.input);

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
