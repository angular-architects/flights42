import type { UserAction as A2UiUserAction } from '@a2ui/web_core/types/client-event';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

interface CheckInActionContext {
  flightId: number;
}

export function checkInAction(action: A2UiUserAction): void {
  const router = inject(Router);
  const context = action.context as unknown as CheckInActionContext;
  router.navigate(['/checkin', { ticketId: context.flightId }]);
}
