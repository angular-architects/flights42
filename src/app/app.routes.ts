import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

import {
  WrapperComponent,
  WrapperConfig,
} from './domains/shared/ui-federation/wrapper.component';
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
    path: 'miles',
    // loadComponent: () => loadRemoteModule('miles', './Component')
    loadChildren: () => loadRemoteModule('miles', './Routes'),
  },
  {
    path: 'svelte-app',
    component: WrapperComponent,
    data: {
      config: {
        remoteName: 'svelte-app',
        exposedModule: './web-components',
        elementName: 'svelte-mfe',
      } as WrapperConfig,
    },
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
    loadComponent: () =>
      import('./domains/luggage/feature-luggage/luggage-overview/luggage-overview').then(
        (m) => m.LuggageOverview,
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
    path: '**',
    redirectTo: 'home',
  },
];
