import { Routes } from '@angular/router';
import { Home } from './shell/home/home';
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
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'booking',
    loadChildren: () => import('./features/booking/booking.routes'),
  },
  {
    path: 'next-flights',
    loadChildren: () =>
      import('./features/next-flights/next-flights.module').then((m) => m.NextFlightsModule),
  },
  {
    path: 'luggage',
    loadComponent: () => import('./features/luggage/luggage').then((m) => m.Luggage),
  },
  {
    path: 'checkin',
    loadComponent: () => import('./features/checkin/checkin').then((m) => m.Checkin),
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
