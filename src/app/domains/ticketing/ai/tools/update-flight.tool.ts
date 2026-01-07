import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { FlightDetailStore } from '../../feature-booking/flight-edit/flight-detail-store';

export const FlightUpdateSchema = s.streaming.object('Flight to be displayed', {
  from: s.anyOf([
    s.nullish(),
    s.string('Departure city. No code but the city name'),
  ]),
  to: s.anyOf([
    s.nullish(),
    s.string('Arrival city. No code but the city name'),
  ]),
  date: s.anyOf([s.nullish(), s.string('Departure date in ISO format')]),
  delayed: s.anyOf([s.nullish(), s.boolean('Flight delayed status')]),
});

interface FlightUpdate {
  from: string | null;
  to: string | null;
  date: string | null;
  delayed: boolean | null;
}

function toPartialFlight(flight: FlightUpdate) {
  return Object.fromEntries(
    Object.entries(flight).filter(([_, value]) => value !== null),
  );
}

export const updateFlight = createTool({
  name: 'updateFlight',
  description: `
    Updates the flight currently displayed in the detail view.
    For instance, this tool can be used to set the delayed flag or to update the flight date.

    So, when the user refers to "the flight" or "this flight" or "current flight", you can update it with this tool.
    
    Remarks:
    - Only pass the flight properties you want to update. For all unknown properties, pass the respecive value
    you receive from the tool getCurrentFlight.

    Preconditions:
    - This tool can ONLY be used when the current route is /flight-booking/flight-edit
      Check this precondition before using this tool.
  `,
  schema: s.streaming.object('parameter object with flight', {
    flight: FlightUpdateSchema,
  }),
  handler: (input) => {
    const store = inject(FlightDetailStore);
    const flightUpdate = toPartialFlight(input.flight);
    store.updateLocalFlight(flightUpdate);
    return Promise.resolve();
  },
});
