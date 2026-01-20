import { Routes } from '@angular/router';

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
    path: 'ticketing',
    loadChildren: () =>
      import('./domains/ticketing/ticketing.routes').then(
        (m) => m.ticketingRoutes,
      ),
  },
  {
    path: 'about',
    loadComponent: () => import('./shell/about/about').then((c) => c.About),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
