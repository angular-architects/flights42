import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

export const displayFlightDetail = createTool({
  name: 'displayFlightDetail',
  description: `
    Routes to the detail of a flight. This detail view can be used to edit the flight.
  `,
  schema: s.object('parameter objekt', {
    flightId: s.number('flightId of the flight to display'),
  }),
  handler: (input) => {
    const router = inject(Router);
    router.navigate(['/ticketing/booking/flight-edit', input.flightId]);
    return Promise.resolve();
  },
});
