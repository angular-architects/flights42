import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';

import { TicketingChatService } from './ticketing-chat-service';

/**
 * Makes the ticketing chat the active assistant chat. Runs on every activation
 * of the booking route — a route-level environment initializer would run only
 * once, because Angular caches the route injector, so coming back from a page
 * that registered its own chat (e.g. the travel planner) would keep that one.
 */
export const activateTicketingChat: CanActivateFn = () => {
  inject(TicketingChatService).init();
  return true;
};
