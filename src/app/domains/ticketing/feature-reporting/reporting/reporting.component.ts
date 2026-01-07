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
  templateUrl: './reporting.component.html',
  styleUrl: './reporting.component.css',
})
export class ReportingComponent {
  data = signal<DataItem[]>([]);

  showDetails = signal(false);
  message = signal('');
  input = signal<string | undefined>(undefined);

  runtime = createChartingRuntime(this.data);
  generator = createChartResource(this.runtime, this.input);

  submit(): void {
    this.input.set(this.message());
  }

  format(value: number) {
    return Number.isInteger(value) ? value.toString() : '';
  }

  toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  regenerate(): void {
    this.generator.reload();
  }

  useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    this.message.set(prompt);
    this.submit();
  }
}
