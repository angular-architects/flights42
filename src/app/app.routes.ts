import { Routes } from '@angular/router';
import { Home } from './shell/home/home';
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
    path: 'booking',
    loadChildren: () => import('./features/booking/booking.routes'), //.then(m => m.bookingRoutes),
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
