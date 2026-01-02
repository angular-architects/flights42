import { Routes } from '@angular/router';
import { BookingTabs } from './booking-tabs';
import { FlightSearch } from './flight-search/flight-search';
import { PassengerSearch } from './passenger-search/passenger-search';
import { PassengerEdit } from './passenger-edit/passenger-edit';
import { Summary } from './summary/summary';
import { FlightEdit } from './flight-edit/flight-edit';
import { ProtoFlightEdit } from './proto-flight-edit/proto-flight-edit';
import { AdvancedFlightEdit } from './advanced-flight-edit/advanced-flight-edit';
import { ReactiveFlightSearch } from './reactive-flight-search/reactive-flight-search';

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
