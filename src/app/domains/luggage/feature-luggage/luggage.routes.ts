import { ɵnonBlocking as nonBlocking, Routes } from '@angular/router';

import { LuggageDetail } from './luggage-detail/luggage-detail';
import { createLuggageResource } from './luggage-detail/luggage-resource';
import { LuggageOverview } from './luggage-overview/luggage-overview';

export const luggageRoutes: Routes = [
  {
    path: '',
    component: LuggageOverview,
  },
  {
    path: ':id',
    component: LuggageDetail,

    resources: (ctx) => ({
      luggage: nonBlocking(createLuggageResource(ctx.params)),
    }),
  },
];
