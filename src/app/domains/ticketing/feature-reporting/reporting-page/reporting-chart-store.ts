import { Injectable, signal } from '@angular/core';

import { DataItem } from '../chart/data-item';

/**
 * Holds the chart of the latest `executeJavaScript` result so its tool call
 * renderer (which runs outside the page) can hand data to the reporting page.
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
