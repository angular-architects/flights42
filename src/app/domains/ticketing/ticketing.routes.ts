import { Routes } from '@angular/router';

import { provideLogger } from '../shared/util-common/logger/provider';
import { FlightEdit } from './feature-booking/flight-edit/flight-edit';
import { FlightSearch } from './feature-booking/flight-search/flight-search';

export const bookingRoutes: Routes = [
  {
    path: '',
    providers: [
      provideLogger({
        formatter: (level, category, msg) => [level, category, msg].join(';'),
      }),
    ],
    children: [
      {
        path: 'flight-search',
        component: FlightSearch,
      },
      {
        path: 'flight-edit/:id',
        component: FlightEdit,
      },
    ],
  },
];

export default bookingRoutes;
