import type { DataStep } from './compile-dashboard.js';
import type { DashboardSpec } from './dashboard-spec.js';

// Module-scoped relay used to ferry the parsed `DashboardSpec` and the
// list of compiler data steps from `renderDashboardTool.execute` to the
// route handler. Mastra's tool result event only carries the surface id
// + A2UI messages, so we cannot read these back via the AG-UI snapshot
// pipeline. A short-lived in-memory map keyed by surface id is the
// smallest viable side channel.
//
// Entries are removed by the consume helpers after the route reads
// them; the cleanup timer is a safety net for runs that fail before
// reaching the consume call.

const TTL_MS = 60_000;

interface RecordedRun {
  spec: DashboardSpec;
  dataSteps: readonly DataStep[];
}

const recordedRuns = new Map<string, RecordedRun>();
const expirationTimers = new Map<string, NodeJS.Timeout>();

export function recordDashboardRun(
  surfaceId: string,
  spec: DashboardSpec,
  dataSteps: readonly DataStep[],
): void {
  recordedRuns.set(surfaceId, { spec, dataSteps });
  clearExpiration(surfaceId);
  expirationTimers.set(
    surfaceId,
    setTimeout(() => {
      recordedRuns.delete(surfaceId);
      expirationTimers.delete(surfaceId);
    }, TTL_MS),
  );
}

export function peekRecordedRun(surfaceId: string): RecordedRun | undefined {
  return recordedRuns.get(surfaceId);
}

export function consumeRecordedRun(surfaceId: string): RecordedRun | undefined {
  const run = recordedRuns.get(surfaceId);
  recordedRuns.delete(surfaceId);
  clearExpiration(surfaceId);
  return run;
}

function clearExpiration(surfaceId: string): void {
  const timer = expirationTimers.get(surfaceId);
  if (timer) {
    clearTimeout(timer);
    expirationTimers.delete(surfaceId);
  }
}
