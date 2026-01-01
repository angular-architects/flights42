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
    path: 'booking',
    loadChildren: () => import('./features/booking/booking.routes'),
  },
  {
    path: 'next-flights',
    loadComponent: () => import('./features/next-flights/next-flights').then((m) => m.NextFlights),
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
