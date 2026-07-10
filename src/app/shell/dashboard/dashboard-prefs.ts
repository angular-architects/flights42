import { Injectable, signal } from '@angular/core';

/**
 * Root-scoped dashboard preferences shared between the dashboard component and
 * the agent store, so the store's per-run `forwardedProps` can read the current
 * "prevent caching" toggle.
 */
@Injectable({ providedIn: 'root' })
export class DashboardPrefs {
  readonly preventCaching = signal(false);
}
