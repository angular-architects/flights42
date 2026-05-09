import type { ContextWithMastra } from '@mastra/core/server';

import { getCachedChartSvg } from '../tools/render-chart.js';

export async function getChartHandler(c: ContextWithMastra): Promise<Response> {
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
