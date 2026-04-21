import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

interface CheckInActionContext {
  flightId: number;
}

export function checkInAction(action: A2uiClientAction): void {
  const router = inject(Router);
  const context = action.context as unknown as CheckInActionContext;
  router.navigate(['/checkin', { ticketId: context.flightId }]);
}
