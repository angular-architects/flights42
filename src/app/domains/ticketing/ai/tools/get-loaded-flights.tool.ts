import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { Flight } from '../../data/flight';
import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const getLoadedFlightsTool = defineAgUiTool({
  name: 'getLoadedFlights',
  description: `
Returns the currently loaded/displayed flights (search/working set). This tool only returns data — it does not render UI.

If the user should **see** these flights as cards, call \`showComponents\` after your text response with one component per flight using the exact shape
\`{ "type": "flightCard", "id", "from", "to", "date", "delay", "status": "other" }\`.
Use this tool when the user asks about the current flight list or search results, not for booked-flight / ticket questions (use the appropriate booked-flights flow instead).
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
