import { TRACE_DASHBOARD_TIMING } from '@flights42/feature-flags';

export interface DashboardTrace {
  specReady(): void;
  compiled(): void;
  finish(cached: boolean): void;
}

function elapsed(from: number, to: number | undefined): number | null {
  return to === undefined ? null : Math.round(to - from);
}

export function createDashboardTrace(): DashboardTrace {
  const startedAt = performance.now();
  let specReadyAt: number | undefined;
  let compiledAt: number | undefined;

  return {
    specReady: () => {
      specReadyAt = performance.now();
    },
    compiled: () => {
      compiledAt = performance.now();
    },
    finish: (cached) => {
      if (!TRACE_DASHBOARD_TIMING) {
        return;
      }
      console.log('Dashboard timing', {
        cached,
        specMs: elapsed(startedAt, specReadyAt),
        compileMs:
          specReadyAt === undefined ? null : elapsed(specReadyAt, compiledAt),
        totalMs: elapsed(startedAt, performance.now()),
      });
    },
  };
}
