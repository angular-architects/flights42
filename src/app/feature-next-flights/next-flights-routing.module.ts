import { Routes } from '@angular/router';
import { NextFlightsOverview } from './next-flights-overview/next-flights-overview';

export const nextFlightRoutes: Routes = [
  {
    path: '',
    component: NextFlightsOverview,
  },
];
