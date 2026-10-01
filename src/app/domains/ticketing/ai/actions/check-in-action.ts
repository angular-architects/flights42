import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

interface CheckInActionContext {
  flightId: number;
}

export function checkInAction(action: A2uiClientAction): void {
  // TODO: Navigate to the check-in page:
  //       1. Get the flightId from the action context
  //       2. Navigate to /checkin and pass the flightId as the
  //          matrix parameter ticketId
}
