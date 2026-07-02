import { getCachedChartSvg } from '../tools/render-chart.js';
export async function getChartHandler(c) {
  const raw = c.req.param('id') ?? '';
  const id = raw.replace(/\.svg$/i, '');
  const svg = getCachedChartSvg(id);
  if (!svg) {
    return c.text('chart not found', 404);
  }
  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
}
