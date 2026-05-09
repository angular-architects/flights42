import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const PALETTE = [
  '#3b82f6',
  '#f97316',
  '#10b981',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#0ea5e9',
  '#22c55e',
];

// Cache rendered chart SVGs in memory and serve them back via a short
// HTTP URL. We cannot return the inline `data:image/svg+xml;...` URL to
// the agent: it can be 10+ KB long, which the LLM tends to truncate (or
// simply gives up on the tool-call format and dumps the surface as plain
// text). A short cache URL keeps tool args and `updateDataModel` values
// tiny, so the model can copy them verbatim.
const chartCache = new Map<string, string>();
const CHART_CACHE_LIMIT = 200;
let chartCounter = 0;

function nextChartId(): string {
  chartCounter = (chartCounter + 1) % 1_000_000;
  return `c${Date.now().toString(36)}${chartCounter.toString(36)}`;
}

function rememberChart(svg: string): string {
  const id = nextChartId();
  chartCache.set(id, svg);
  while (chartCache.size > CHART_CACHE_LIMIT) {
    const oldest = chartCache.keys().next().value;
    if (!oldest) {
      break;
    }
    chartCache.delete(oldest);
  }
  return id;
}

export interface FlightChartDataset {
  label?: string;
  data: number[];
  color?: string;
}

export interface BuildAndCacheChartArgs {
  type: 'bar' | 'pie';
  title?: string;
  labels: string[];
  datasets: FlightChartDataset[];
}

/**
 * Renders a chart SVG with the same shapes the public `renderChartTool`
 * produces, caches it, and returns the short HTTP URL the client can
 * embed in an `Image` component. Shared with composite tools (e.g.
 * `renderFlightChartTool`) to avoid an extra LLM round-trip per chart.
 */
export function buildAndCacheChartUrl(args: BuildAndCacheChartArgs): string {
  const svg =
    args.type === 'bar'
      ? renderBarChart({
          labels: args.labels,
          datasets: args.datasets,
          title: args.title,
        })
      : renderPieChart({
          labels: args.labels,
          datasets: args.datasets,
          title: args.title,
        });
  const id = rememberChart(svg);
  return `${CHART_BASE_URL}/charts/${id}.svg`;
}

export function getCachedChartSvg(id: string): string | undefined {
  return chartCache.get(id);
}

const CHART_BASE_URL = (
  process.env['AI_SERVER_PUBLIC_URL'] ?? 'http://localhost:3001'
).replace(/\/+$/, '');

const datasetSchema = z.object({
  label: z
    .string()
    .optional()
    .describe('Series label, shown in the legend when more than one series.'),
  data: z.array(z.number()),
  color: z
    .string()
    .optional()
    .describe('Optional CSS color for this series; otherwise a palette color.'),
});

export const renderChartTool = createTool({
  id: 'renderChart',
  description: [
    'Render a small bar or pie chart as an SVG image.',
    'Returns `{ url }` where `url` is a short HTTP URL pointing at the',
    'rendered SVG (e.g. `http://localhost:3001/charts/<id>.svg`). Embed',
    'that URL verbatim in an A2UI `Image` component (its `url` field),',
    'either directly or via `{ path: "/..." }` after seeding it through',
    '`updateDataModel`.',
    '',
    'Bar charts: pass `labels` (one entry per group on the x-axis) and one or',
    'more `datasets` whose `data` arrays have the same length as `labels`.',
    'Pie charts: pass `labels` and a single dataset whose `data` array has',
    'the same length as `labels` (each entry is one slice).',
    '',
    'The SVG is generated locally and cached on the server; the returned',
    'URL is short on purpose so it can be copied verbatim into A2UI',
    'messages without truncation. Do NOT build inline `data:` URLs by hand.',
  ].join('\n'),
  inputSchema: z.object({
    type: z.enum(['bar', 'pie']),
    title: z.string().optional(),
    labels: z.array(z.string()).min(1),
    datasets: z.array(datasetSchema).min(1),
  }),
  outputSchema: z.object({
    url: z.string(),
  }),
  execute: async ({ type, title, labels, datasets }) => {
    const svg =
      type === 'bar'
        ? renderBarChart({ labels, datasets, title })
        : renderPieChart({ labels, datasets, title });
    const id = rememberChart(svg);
    return {
      url: `${CHART_BASE_URL}/charts/${id}.svg`,
    };
  },
});

interface ChartArgs {
  labels: string[];
  datasets: { label?: string; data: number[]; color?: string }[];
  title?: string;
}

function renderBarChart({ labels, datasets, title }: ChartArgs): string {
  const W = 640;
  const H = 360;
  const PAD = {
    top: title ? 48 : 24,
    right: 16,
    bottom: datasets.length > 1 ? 64 : 44,
    left: 48,
  };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...datasets.flatMap((d) => d.data));
  const groupCount = labels.length;
  const seriesCount = datasets.length;
  const groupWidth = innerW / Math.max(1, groupCount);
  const barWidth = (groupWidth * 0.7) / Math.max(1, seriesCount);
  const groupPad = (groupWidth - barWidth * seriesCount) / 2;
  const yTicks = niceTicks(max, 4);

  const titleSvg = title
    ? `<text x="${W / 2}" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#0f172a">${escapeXml(title)}</text>`
    : '';

  const yLabelsSvg = yTicks
    .map((tick) => {
      const y = PAD.top + innerH - (tick / max) * innerH;
      return (
        `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + innerW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />` +
        `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-family="system-ui, sans-serif" font-size="11" fill="#64748b">${tick}</text>`
      );
    })
    .join('');

  const xLabelsSvg = labels
    .map((label, i) => {
      const x = PAD.left + i * groupWidth + groupWidth / 2;
      return `<text x="${x}" y="${PAD.top + innerH + 18}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#475569">${escapeXml(label)}</text>`;
    })
    .join('');

  const barsSvg = labels
    .flatMap((_, gi) =>
      datasets.map((ds, si) => {
        const value = ds.data[gi] ?? 0;
        const barH = (value / max) * innerH;
        const x = PAD.left + gi * groupWidth + groupPad + si * barWidth;
        const y = PAD.top + innerH - barH;
        const color = ds.color ?? PALETTE[si % PALETTE.length];
        return `<rect x="${x}" y="${y}" width="${Math.max(0, barWidth - 2)}" height="${barH}" fill="${color}" rx="2" />`;
      }),
    )
    .join('');

  const legendSvg =
    seriesCount > 1
      ? datasets
          .map((ds, si) => {
            const x = PAD.left + si * 120;
            const y = H - 16;
            const color = ds.color ?? PALETTE[si % PALETTE.length];
            const label = ds.label ?? `Series ${si + 1}`;
            return (
              `<rect x="${x}" y="${y - 8}" width="10" height="10" fill="${color}" rx="2" />` +
              `<text x="${x + 14}" y="${y}" font-family="system-ui, sans-serif" font-size="11" fill="#475569">${escapeXml(label)}</text>`
            );
          })
          .join('')
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
  <rect width="${W}" height="${H}" fill="#ffffff" />
  ${titleSvg}
  ${yLabelsSvg}
  ${barsSvg}
  <line x1="${PAD.left}" y1="${PAD.top + innerH}" x2="${PAD.left + innerW}" y2="${PAD.top + innerH}" stroke="#cbd5e1" stroke-width="1" />
  ${xLabelsSvg}
  ${legendSvg}
</svg>`;
}

function renderPieChart({ labels, datasets, title }: ChartArgs): string {
  const data = datasets[0]?.data ?? [];
  const W = 480;
  const H = 320;
  const cx = 320;
  const cy = title ? 168 : 156;
  const r = 110;
  const total = data.reduce((sum, v) => sum + v, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = data
    .map((value, i) => {
      const sweep = (value / total) * Math.PI * 2;
      const startAngle = angle;
      const endAngle = startAngle + sweep;
      angle = endAngle;
      const color = PALETTE[i % PALETTE.length];

      if (sweep === 0) {
        return '';
      }
      if (sweep >= Math.PI * 2 - 1e-6) {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
      }
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" />`;
    })
    .join('');

  const legendSvg = labels
    .map((label, i) => {
      const value = data[i] ?? 0;
      const pct = total > 0 ? Math.round((value / total) * 100) : 0;
      const color = PALETTE[i % PALETTE.length];
      const x = 24;
      const y = (title ? 56 : 40) + i * 20;
      return (
        `<rect x="${x}" y="${y - 9}" width="10" height="10" fill="${color}" rx="2" />` +
        `<text x="${x + 14}" y="${y}" font-family="system-ui, sans-serif" font-size="11" fill="#475569">${escapeXml(label)} — ${value} (${pct}%)</text>`
      );
    })
    .join('');

  const titleSvg = title
    ? `<text x="${W / 2}" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#0f172a">${escapeXml(title)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
  <rect width="${W}" height="${H}" fill="#ffffff" />
  ${titleSvg}
  ${slices}
  ${legendSvg}
</svg>`;
}

function niceTicks(max: number, count: number): number[] {
  if (max <= 0) {
    return [0];
  }
  const step = niceStep(max / Math.max(1, count));
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

function niceStep(rough: number): number {
  if (rough <= 0) {
    return 1;
  }
  const exp = Math.floor(Math.log10(rough));
  const f = rough / 10 ** exp;
  let nice;
  if (f < 1.5) {
    nice = 1;
  } else if (f < 3) {
    nice = 2;
  } else if (f < 7) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * 10 ** exp;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
