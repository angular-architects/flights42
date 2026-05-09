import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { FlightStore } from '../../../domains/ticketing/feature-booking/flight-search/flight-store';

interface DashboardFlightSearchContext {
  from?: string;
  to?: string;
}

export function dashboardFlightSearchAction(action: A2uiClientAction): void {
  const context = action.context as DashboardFlightSearchContext;
  const from = context.from?.trim();
  const to = context.to?.trim();

  if (!from || !to) {
    return;
  }

  const store = inject(FlightStore);
  const router = inject(Router);
  store.updateFilter(from, to);
  void router.navigate(['/ticketing/booking/flight-search']);
}
