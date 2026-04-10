import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui';

import { Flight } from '../../data/flight';
import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const getLoadedFlightsTool = defineAgUiTool({
  name: 'getLoadedFlights',
  description: `
Returns the currently loaded/displayed flights.

Remarks:
- This tool is NOT displaying the list with these flights to the user
- This list is useful to answer questions about the current working set
- Use this tool when the user is asking for flights in general but not when they are asking for booked flights, tickets or check-in
- The returned flights are not booked. If displayed with the flightWidget, use status: 'other'
    `.trim(),
  execute: () => {
    const store = inject(FlightStore);
    return store.flightsValue().map(toFlightInfo);
  },
});

function toFlightInfo(flight: Flight): FlightInfo {
  return {
    id: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date,
    delay: flight.delay,
  };
}
