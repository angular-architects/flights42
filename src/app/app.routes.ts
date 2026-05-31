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
    path: 'booking',
    loadChildren: () => import('./domains/ticketing/ticketing.routes'),
  },
  {
    path: 'about',
    component: About,
  },
  // This _needs_ to be the last route!
  {
    path: '**',
    component: NotFound,
  },
];
