import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

const GRID = 21;
const FINDER_POSITIONS: [number, number][] = [
  [0, 0],
  [GRID - 7, 0],
  [0, GRID - 7],
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
}

function isFinder(x: number, y: number): boolean {
  return FINDER_POSITIONS.some(([fx, fy]) => {
    return x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
  });
}

function buildModules(seed: string): boolean[][] {
  const modules: boolean[][] = [];
  let h = hashString(seed) || 1;
  for (let y = 0; y < GRID; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID; x += 1) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      row.push(((h >> 8) & 1) === 1);
    }
    modules.push(row);
  }
  return modules;
}

interface QrCell {
  x: number;
  y: number;
}

@Component({
  selector: 'app-ticket-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Boarding pass QR code">
      <rect
        x="0"
        y="0"
        [attr.width]="size()"
        [attr.height]="size()"
        fill="#fff" />

      @for (cell of dataModules(); track cell.x + '-' + cell.y) {
        <rect
          [attr.x]="cell.x"
          [attr.y]="cell.y"
          width="1"
          height="1"
          fill="currentColor" />
      }

      @for (corner of finderCorners(); track corner.x + '-' + corner.y) {
        <g [attr.transform]="'translate(' + corner.x + ' ' + corner.y + ')'">
          <rect x="0" y="0" width="7" height="7" fill="currentColor" />
          <rect x="1" y="1" width="5" height="5" fill="#fff" />
          <rect x="2" y="2" width="3" height="3" fill="currentColor" />
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      color: var(--ticket-accent, #1c2640);
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    }
  `,
})
export class TicketQr {
  readonly seed = input<string>('FLIGHT42');

  protected readonly size = computed(() => GRID);
  protected readonly viewBox = computed(() => `0 0 ${GRID} ${GRID}`);

  protected readonly finderCorners = computed<QrCell[]>(() =>
    FINDER_POSITIONS.map(([x, y]) => ({ x, y })),
  );

  protected readonly dataModules = computed<QrCell[]>(() => {
    const modules = buildModules(this.seed());
    const cells: QrCell[] = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if (isFinder(x, y)) {
          continue;
        }
        if (modules[y][x]) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  });
}
