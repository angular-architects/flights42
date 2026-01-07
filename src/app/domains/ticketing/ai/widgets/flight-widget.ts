import { exposeComponent } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { FlightSchema } from '../../data/flight-info';
import { FlightWidgetComponent } from './flight-widget.component';

export const flightWidget = exposeComponent(FlightWidgetComponent, {
  // name: 'flightWidget',
  description: `
    Displays a flight or flight ticket. Use this instead of textual 
    descriptions of flights or tickets.
    `,
  input: {
    flight: FlightSchema,
    status: s.enumeration(
      `Whether the flight is booked or not. 
      
      A flight has the status 'booked' **only**  when retrieved 
      via the tool 'getBookedFlights'.
      
      ## Example for infering a status 'booked'
      - User: Which flights did I book?
      - Assistant:
          - Tool: getBookedFlights()
          - UI: flightWidget({flightInfo: { id: 0, ..., status: 'booked' }})

      ## Example for infering a status 'other'
      - User: Which of the found flights is the earliest one?
      - Assistant:
          - Tool: getLoadedFlights()
          - UI: flightWidget({flightInfo: { id: 0, ..., status: 'other' }})
      `,
      ['booked', 'other'],
    ),
  },
});
