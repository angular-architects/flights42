import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

const TOTAL_WIDTH = 200;
const HEIGHT = 40;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash || 1;
}

interface Bar {
  x: number;
  width: number;
}

function buildBars(seed: string): Bar[] {
  const bars: Bar[] = [];
  let h = hashString(seed);
  let cursor = 4;

  while (cursor < TOTAL_WIDTH - 4) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const barWidth = 1 + ((h >> 2) % 4);
    const gap = 1 + ((h >> 9) % 3);

    if (cursor + barWidth > TOTAL_WIDTH - 4) {
      break;
    }

    bars.push({ x: cursor, width: barWidth });
    cursor += barWidth + gap;
  }

  return bars;
}

@Component({
  selector: 'app-ticket-barcode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + totalWidth() + ' ' + height()"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Boarding pass barcode"
      preserveAspectRatio="none">
      @for (bar of bars(); track bar.x) {
        <rect
          [attr.x]="bar.x"
          y="0"
          [attr.width]="bar.width"
          [attr.height]="height()"
          fill="currentColor" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: var(--ticket-accent, #1c2640);
    }
    svg {
      display: block;
      width: 100%;
      height: 2.5rem;
    }
  `,
})
export class TicketBarcode {
  readonly seed = input<string>('FLIGHT42');

  protected readonly totalWidth = computed(() => TOTAL_WIDTH);
  protected readonly height = computed(() => HEIGHT);
  protected readonly bars = computed<Bar[]>(() => buildBars(this.seed()));
}
