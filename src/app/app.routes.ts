import { Routes } from '@angular/router';

import { About } from './shell/about/about';
import { Home } from './shell/home/home';
import { NotFound } from './shell/not-found/not-found';

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
    path: 'dashboard',
    loadComponent: () =>
      import('./shell/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'ticketing',
    loadChildren: () =>
      import('./domains/ticketing/ticketing.routes').then(
        (m) => m.bookingRoutes,
      ),
  },
  {
    path: 'next-flights',
    loadChildren: () =>
      import('./domains/ticketing/feature-next-flights/next-flights.module').then(
        (m) => m.NextFlightsModule,
      ),
  },
  {
    path: 'luggage',
    loadChildren: () =>
      import('./domains/luggage/feature-luggage/luggage.routes').then(
        (m) => m.luggageRoutes,
      ),
  },
  {
    path: 'checkin',
    loadComponent: () =>
      import('./domains/checkin/feature-checkin/checkin-page').then(
        (m) => m.CheckinPage,
      ),
  },
  {
    path: 'about',
    component: About,
  },
  {
    path: 'not-found',
    component: NotFound,
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
