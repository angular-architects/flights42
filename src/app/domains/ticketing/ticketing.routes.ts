import { Routes } from '@angular/router';

import { FlightEdit } from './feature-booking/flight-edit/flight-edit';
import { FlightSearch } from './feature-booking/flight-search/flight-search';

export const bookingRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'flight-search',
  },
  {
    path: 'flight-search',
    component: FlightSearch,
  },
  {
    path: 'flight-edit/:id',
    component: FlightEdit,
  },
];

export default bookingRoutes;
