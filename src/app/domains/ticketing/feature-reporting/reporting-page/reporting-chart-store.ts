import { Injectable, signal } from '@angular/core';

import { DataItem } from '../chart/data-item';

/**
 * Holds the chart the `renderChart` tool produces so the frontend tool handler
 * (which runs outside the component) can hand data to the reporting page.
 */
@Injectable({ providedIn: 'root' })
export class ReportingChartStore {
  readonly data = signal<DataItem[]>([]);
  readonly title = signal<string | null>(null);

  setChart(title: string, data: DataItem[]): void {
    this.title.set(title);
    this.data.set(data);
  }

  clear(): void {
    this.data.set([]);
    this.title.set(null);
  }
}
