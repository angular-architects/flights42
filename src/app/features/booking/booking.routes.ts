import { Routes } from '@angular/router';
import { BookingTabs } from './booking-tabs';
import { FlightSearch } from './flight-search/flight-search';
import { FlightEdit } from './flight-edit/flight-edit';
import { PassengerSearch } from './passenger-search/passenger-search';
import { PassengerEdit } from './passenger-edit/passenger-edit';
import { Summary } from './summary/summary';
import { AlternativeFlightSearch } from './flight-search/alternative-flight-search';

export const bookingRoutes: Routes = [
  {
    path: '',
    component: BookingTabs,
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
        path: 'alternative-flight-search',
        component: AlternativeFlightSearch,
      },
      {
        path: 'flight-edit/:id',
        component: FlightEdit,
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
