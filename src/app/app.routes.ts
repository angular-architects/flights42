import { Routes } from '@angular/router';

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
    path: 'dashboard',
    loadComponent: () =>
      import('./feature-dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'booking',
    loadChildren: () =>
      import('./feature-booking/booking.routes').then((m) => m.bookingRoutes),
  },
  {
    path: 'next-flights',
    loadChildren: () =>
      import('./feature-next-flights/next-flights.module').then(
        (m) => m.NextFlightsModule,
      ),
  },
  {
    path: 'luggage',
    loadComponent: () =>
      import('./feature-luggage/luggage-overview/luggage-overview').then(
        (m) => m.LuggageOverview,
      ),
  },
  {
    path: 'checkin',
    loadComponent: () =>
      import('./feature-checkin/checkin').then((m) => m.Checkin),
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
