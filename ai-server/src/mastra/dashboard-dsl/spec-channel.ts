import type { DashboardSpec } from './dashboard-spec.js';

// Module-scoped relay used to ferry the parsed `DashboardSpec` from
// `renderDashboardTool.execute` (called by Mastra during a streamed run)
// to the route handler that owns the cache. Mastra's tool result event
// only carries the surface id + A2UI messages, so we cannot read the
// spec back via the AG-UI snapshot pipeline. A short-lived in-memory
// map keyed by surface id is the smallest viable side channel.
//
// Entries are removed by `consumeRecordedSpec` after the route reads
// them, with a cleanup timer for safety in case the route fails before
// reading.

const TTL_MS = 60_000;

const recordedSpecs = new Map<string, DashboardSpec>();
const expirationTimers = new Map<string, NodeJS.Timeout>();

export function recordDashboardSpec(
  surfaceId: string,
  spec: DashboardSpec,
): void {
  recordedSpecs.set(surfaceId, spec);
  clearExpiration(surfaceId);
  expirationTimers.set(
    surfaceId,
    setTimeout(() => {
      recordedSpecs.delete(surfaceId);
      expirationTimers.delete(surfaceId);
    }, TTL_MS),
  );
}

export function consumeRecordedSpec(
  surfaceId: string,
): DashboardSpec | undefined {
  const spec = recordedSpecs.get(surfaceId);
  recordedSpecs.delete(surfaceId);
  clearExpiration(surfaceId);
  return spec;
}

function clearExpiration(surfaceId: string): void {
  const timer = expirationTimers.get(surfaceId);
  if (timer) {
    clearTimeout(timer);
    expirationTimers.delete(surfaceId);
  }
}
