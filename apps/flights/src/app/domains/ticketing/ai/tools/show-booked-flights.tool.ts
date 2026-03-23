import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createTool } from '@hashbrownai/angular';

export const showBookedFlights = createTool({
  name: 'showBookedFlights',
  description: `
    Displays the upcoming booked flights (aka next flights) of the current user.
    This view is used for check-in.
    Only display this view when the user is explicitly requesting to check in.
  `,
  handler: () => {
    const router = inject(Router);
    router.navigate(['/next-flights']);
    return Promise.resolve();
  },
});
