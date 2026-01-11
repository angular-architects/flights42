import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'ticketing/reporting',
    renderMode: RenderMode.Client,
  },
  {
    path: 'ticketing/booking/flight-edit/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // const flightClient = inject(FlightClient);
      return [{ id: '1' }, { id: '2' }, { id: '3' }];
    },
  },
  {
    path: 'about',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
