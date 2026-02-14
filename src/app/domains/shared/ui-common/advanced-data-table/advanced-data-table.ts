import { CommonModule, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChildren,
  input,
  signal,
} from '@angular/core';

import { TableField } from '../data-table/table-field';

type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  column: keyof T;
  direction: SortDirection;
}

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, NgTemplateOutlet],
  templateUrl: './advanced-data-table.html',
  styleUrl: './advanced-data-table.css',
})
export class DataTable<T extends object> {
  readonly data = input<T[]>([]);
  readonly pageSize = input<number>(2);

  protected readonly fields = contentChildren<TableField<T>>(TableField);

  protected readonly sortState = signal<SortState<T>>({
    column: 'id' as keyof T,
    direction: 'asc',
  });

  protected readonly currentPage = signal<number>(0);

  readonly sortedData = computed(() => sortData(this.data(), this.sortState()));

  protected readonly colInfo = computed(() =>
    buildColumnInfo(this.fields(), this.sortState()),
  );

  readonly pagedData = computed(() =>
    paginateData(this.sortedData(), this.currentPage(), this.pageSize()),
  );

  protected readonly totalPages = computed(() =>
    Math.ceil(this.sortedData().length / this.pageSize()),
  );

  protected sort(column: keyof T): void {
    const current = this.sortState();

    if (current.column === column) {
      this.sortState.set({
        column,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      this.sortState.set({ column, direction: 'asc' });
    }

    this.currentPage.set(0);
  }

  protected previousPage(): void {
    const current = this.currentPage();
    if (current > 0) {
      this.currentPage.set(current - 1);
    }
  }

  protected nextPage(): void {
    const current = this.currentPage();
    if (current < this.totalPages() - 1) {
      this.currentPage.set(current + 1);
    }
  }
}

function sortData<T extends object>(data: T[], sortState: SortState<T>): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortState.column];
    const bVal = b[sortState.column];

    let comparison = 0;
    if (aVal > bVal) {
      comparison = 1;
    } else if (aVal < bVal) {
      comparison = -1;
    }

    return sortState.direction === 'asc' ? comparison : -comparison;
  });
}

function buildColumnInfo<T>(
  fields: readonly TableField<T>[],
  sortState: SortState<T>,
): Record<PropertyKey, string> {
  const result: Record<PropertyKey, string> = {};

  for (const field of fields) {
    const propName = field.propName();
    const title = field.title();

    if (sortState.column === propName) {
      const arrow = sortState.direction === 'asc' ? '↑' : '↓';
      result[propName as PropertyKey] = `${String(title)} ${arrow}`;
    } else {
      result[propName as PropertyKey] = `${String(title)}  `;
    }
  }

  return result;
}

function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number,
): (T | null)[] {
  const start = page * pageSize;
  const pageData: (T | null)[] = data.slice(start, start + pageSize);

  while (pageData.length < pageSize) {
    pageData.push(null);
  }

  return pageData;
}
