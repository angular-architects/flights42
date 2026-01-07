import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { TicketingChatService } from './ai/ticketing-chat-service';
import { AdvancedFlightEdit } from './feature-booking/advanced-flight-edit/advanced-flight-edit';
import { BookingNavigation } from './feature-booking/booking-navigation';
import { FlightEdit } from './feature-booking/flight-edit/flight-edit';
import { FlightSearch } from './feature-booking/flight-search/flight-search';
import { PassengerEdit } from './feature-booking/passenger-edit/passenger-edit';
import { PassengerSearch } from './feature-booking/passenger-search/passenger-search';
import { ProtoFlightEdit } from './feature-booking/proto-flight-edit/proto-flight-edit';
import { ReactiveFlightSearch } from './feature-booking/reactive-flight-search/reactive-flight-search';
import { Summary } from './feature-booking/summary/summary';

export const bookingRoutes: Routes = [
  {
    path: 'booking',
    component: BookingNavigation,
    resolve: {
      ai: configAi,
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'flight-search',
      },
      {
        path: 'flight-search',
        component: FlightSearch,
      },
      {
        path: 'reactive-flight-search',
        component: ReactiveFlightSearch,
      },
      {
        path: 'flight-edit/:id',
        component: FlightEdit,
      },
      {
        path: 'proto-flight-edit/:id',
        component: ProtoFlightEdit,
      },
      {
        path: 'advanced-flight-edit/:id',
        component: AdvancedFlightEdit,
      },
      {
        path: 'passenger-search',
        component: PassengerSearch,
      },
      {
        path: 'passenger-edit/:id',
        component: PassengerEdit,
      },
      {
        path: 'summary',
        component: Summary,
      },
    ],
  },
];

export default bookingRoutes;

function configAi() {
  inject(TicketingChatService).init();
  return true;
}
