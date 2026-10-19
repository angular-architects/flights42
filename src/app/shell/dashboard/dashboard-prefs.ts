import { Injectable, signal } from '@angular/core';

/**
 * Root-scoped dashboard preferences. The dashboard sends the current
 * "prevent caching" toggle as `forwardedProps` with every message.
 */
@Injectable({ providedIn: 'root' })
export class DashboardPrefs {
  readonly preventCaching = signal(false);
}
