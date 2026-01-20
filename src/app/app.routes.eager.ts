import { Routes } from '@angular/router';

import { BookingNavigation } from './domains/ticketing/feature-booking/booking-navigation';
import { FlightEdit } from './domains/ticketing/feature-booking/flight-edit/flight-edit';
import { FlightSearch } from './domains/ticketing/feature-booking/flight-search/flight-search';
import { PassengerSearch } from './domains/ticketing/feature-booking/passenger-search/passenger-search';
import { About } from './shell/about/about';
import { Home } from './shell/home/home';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'booking',
    component: BookingNavigation,
    children: [
      {
        path: '',
        redirectTo: 'flight-search',
        pathMatch: 'full',
      },
      {
        path: 'flight-search',
        component: FlightSearch,
      },
      {
        path: 'flight-edit/:id',
        component: FlightEdit,
      },
      {
        path: 'passenger-search',
        component: PassengerSearch,
      },
    ],
  },
  {
    path: 'about',
    component: About,
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
