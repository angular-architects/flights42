import { Routes } from '@angular/router';
import { Home } from './shell/home/home';
import { FlightSearch } from './features/booking/flight-search/flight-search';
import { FlightEdit } from './features/booking/flight-edit/flight-edit';
import { PassengerSearch } from './features/booking/passenger-search/passenger-search';
import { PassengerEdit } from './features/booking/passenger-edit/passenger-edit';
import { NextFlights } from './features/next-flights/next-flights';
import { Luggage } from './features/luggage/luggage';
import { Checkin } from './features/checkin/checkin';
import { About } from './shell/about/about';

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
  {
    path: 'passenger-edit/:id',
    component: PassengerEdit,
  },
  {
    path: 'next-flights',
    component: NextFlights,
  },
  {
    path: 'luggage',
    component: Luggage,
  },
  {
    path: 'checkin',
    component: Checkin,
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
