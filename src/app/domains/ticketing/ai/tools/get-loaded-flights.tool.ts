import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';

import { Flight } from '../../data/flight';
import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

export const getLoadedFlightsTool = defineAgUiTool({
  name: 'getLoadedFlights',
  description: `
Returns the currently loaded/displayed flights (search/working set). This tool only returns data — it does not render UI.

If the user should **see** these flights as cards in the chat, call \`showComponents\` after your text response.
Use the registered \`flightCard\` component from \`showComponents\` for each shown flight.
Follow the exact \`showComponents\` schema and examples from that tool description.
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
