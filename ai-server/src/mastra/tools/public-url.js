/**
 * Public-facing base URL of the ai-server, used for short HTTP links the
 * agent embeds in A2UI surfaces (charts, hotel/car images, ...). Mirrors
 * the resolution used in `render-chart.ts` so all server-emitted URLs
 * share a single configuration source.
 */
export const AI_SERVER_PUBLIC_URL = (
  process.env['AI_SERVER_PUBLIC_URL'] ?? 'http://localhost:3001'
).replace(/\/+$/, '');
